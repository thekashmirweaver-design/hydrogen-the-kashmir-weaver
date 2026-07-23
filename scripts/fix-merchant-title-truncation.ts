/**
 * Fix Merchant Center text_value_truncated (title too long).
 *
 * Shopify App API titles often look like:
 *   {Color} Cashmere Scarf & Pashmina Shawl | Handwoven Kashmir | The Kashmir Weaver {Color} / {Size} …
 * Brand is already a separate attribute; remove the suffix + duplicated color, keep size.
 *
 * Writes into each Shopify App API primary data source (same pattern as
 * fix-merchant-product-links.ts), preserving other required attributes.
 *
 * Usage: npx tsx scripts/fix-merchant-title-truncation.ts
 */
import {readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';

const ROOT = new URL('..', import.meta.url).pathname;
function loadEnv() {
  const text = readFileSync(`${ROOT}.env`, 'utf8');
  for (const line of text.split('\n')) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (!m) continue;
    if (!(m[1] in process.env)) {
      process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
    }
  }
}
loadEnv();

const MERCHANT = process.env.MERCHANT_ID || '5825882191';
const TITLE_MAX = 150;
/** Fix titles at/near the limit that still carry the redundant brand suffix. */
const FIX_IF_LEN_AT_LEAST = 140;

if (!process.env.GOOGLE_APPLICATION_CREDENTIALS) {
  process.env.GOOGLE_APPLICATION_CREDENTIALS = `${ROOT}secrets/google/merchant-service-account.json`;
}

function googleToken() {
  return execFileSync(
    'gcloud',
    [
      'auth',
      'print-access-token',
      '--scopes=https://www.googleapis.com/auth/content',
    ],
    {encoding: 'utf8'},
  ).trim();
}

let cached: string | null = null;
const token = () => (cached ??= googleToken());

async function api(url: string, init?: RequestInit, attempt = 0) {
  const res = await fetch(url, {
    ...init,
    headers: {
      Authorization: `Bearer ${token()}`,
      'Content-Type': 'application/json',
      ...(init?.headers || {}),
    },
  });
  const text = await res.text();
  const data = text ? JSON.parse(text) : {};
  if ((res.status === 401 || res.status === 403) && attempt < 2) {
    cached = null;
    return api(url, init, attempt + 1);
  }
  if ((res.status === 429 || res.status >= 500) && attempt < 4) {
    await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)));
    return api(url, init, attempt + 1);
  }
  if (!res.ok) throw new Error(`${res.status} ${url}: ${text.slice(0, 1000)}`);
  return data;
}

type McProduct = {
  id: string;
  offerId?: string;
  feedLabel?: string;
  contentLanguage?: string;
  title?: string;
  description?: string;
  imageLink?: string;
  additionalImageLinks?: string[];
  availability?: string;
  condition?: string;
  brand?: string;
  color?: string;
  sizes?: string[];
  googleProductCategory?: string;
  itemGroupId?: string;
  ageGroup?: string;
  gender?: string;
  price?: {value: string; currency: string};
  salePrice?: {value: string; currency: string};
  link?: string;
  canonicalLink?: string;
};

function micros(value: string) {
  return String(Math.round(parseFloat(value) * 1_000_000));
}

function mapAvailability(raw?: string) {
  const v = (raw || '').toLowerCase();
  if (v.includes('out')) return 'OUT_OF_STOCK';
  if (v.includes('preorder')) return 'PREORDER';
  if (v.includes('backorder')) return 'BACKORDER';
  return 'IN_STOCK';
}

/** Close dangling dimension parens left by Google truncation. */
function closeDanglingParens(title: string) {
  const open = (title.match(/\(/g) || []).length;
  const close = (title.match(/\)/g) || []).length;
  if (open > close) return title + ')'.repeat(open - close);
  return title;
}

/**
 * Shorten Merchant titles without inventing claims.
 * Prefer removing "| The Kashmir Weaver" + duplicated variant color.
 */
export function shortenTitle(title: string, maxLen = TITLE_MAX): string {
  let t = (title || '').trim();
  const brandRe = /\s*\|\s*The Kashmir Weaver\b\s*/i;
  const m = brandRe.exec(t);
  if (m) {
    const base = t.slice(0, m.index).trimEnd();
    let rest = t.slice(m.index + m[0].length).trim();
    if (rest) {
      const parts = rest.split(/\s*\/\s*/).map((p) => p.trim()).filter(Boolean);
      if (parts[0] && base.toLowerCase().includes(parts[0].toLowerCase())) {
        parts.shift();
      }
      rest = parts.join(' / ');
      t = rest ? `${base} | ${rest}` : base;
    } else {
      t = base;
    }
  }

  if (t.length > maxLen) {
    t = t.replace(/\s*\|\s*Handwoven Kashmir\b/i, ' | Handwoven');
  }
  if (t.length > maxLen) {
    t = t.replace(/Cashmere Scarf\s*&\s*Pashmina Shawl/i, 'Cashmere Pashmina Shawl');
  }
  if (t.length > maxLen) {
    t = t.replace(/\s*\|\s*Handwoven\b/i, '');
  }
  if (t.length > maxLen) {
    let cut = t.slice(0, maxLen);
    for (const sep of [' | ', ' / ', ' ']) {
      const i = cut.lastIndexOf(sep);
      if (i >= 80) {
        cut = cut.slice(0, i).replace(/[\s|/]+$/, '');
        break;
      }
    }
    t = cut;
  }

  t = closeDanglingParens(t.trim()).slice(0, maxLen).trim();
  return t;
}

type WriteTarget = {feedLabel: string; dataSourceId: string; kind: 'primary' | 'supplemental'};

/**
 * Shopify App API primaries + their rule-linked supplementals (supplemental
 * wins in takeFromDataSources, so titles survive Shopify re-sync).
 */
async function listWriteTargets(): Promise<WriteTarget[]> {
  const listed = await api(
    `https://merchantapi.googleapis.com/datasources/v1/accounts/${MERCHANT}/dataSources`,
  );
  const targets: WriteTarget[] = [];
  const seen = new Set<string>();

  for (const ds of listed.dataSources || []) {
    const primary = ds.primaryProductDataSource;
    const name = String(ds.displayName || '');
    if (!primary?.feedLabel) continue;
    if (!/shopify app api/i.test(name)) continue;
    const feedLabel = String(primary.feedLabel);
    const primaryId = String(ds.dataSourceId);
    const key = `${feedLabel}:${primaryId}`;
    if (!seen.has(key)) {
      seen.add(key);
      targets.push({feedLabel, dataSourceId: primaryId, kind: 'primary'});
    }
    for (const rule of primary.defaultRule?.takeFromDataSources || []) {
      const supp = String(rule.supplementalDataSourceName || '');
      const m = supp.match(/dataSources\/(\d+)/);
      if (!m) continue;
      const sk = `${feedLabel}:${m[1]}`;
      if (seen.has(sk)) continue;
      seen.add(sk);
      targets.push({
        feedLabel,
        dataSourceId: m[1],
        kind: 'supplemental',
      });
    }
  }
  return targets;
}

async function listProducts(): Promise<McProduct[]> {
  const out: McProduct[] = [];
  let pageToken: string | undefined;
  do {
    const q = new URLSearchParams({maxResults: '250'});
    if (pageToken) q.set('pageToken', pageToken);
    const data = await api(
      `https://shoppingcontent.googleapis.com/content/v2.1/${MERCHANT}/products?${q}`,
    );
    out.push(...(data.resources || []));
    pageToken = data.nextPageToken;
    process.stdout.write(`\rFetched products: ${out.length}`);
  } while (pageToken);
  console.log();
  return out;
}

async function listTruncatedOfferIds(): Promise<Set<string>> {
  const ids = new Set<string>();
  let pageToken: string | undefined;
  do {
    const q = new URLSearchParams({maxResults: '250'});
    if (pageToken) q.set('pageToken', pageToken);
    const data = await api(
      `https://shoppingcontent.googleapis.com/content/v2.1/${MERCHANT}/productstatuses?${q}`,
    );
    for (const ps of data.resources || []) {
      const issues = ps.itemLevelIssues || [];
      const hit = issues.some(
        (i: {code?: string; attributeName?: string; description?: string}) =>
          i.code === 'text_value_truncated' &&
          (i.attributeName === 'title' ||
            /title/i.test(i.description || '')),
      );
      if (!hit) continue;
      const productId = String(ps.productId || '');
      const parts = productId.split(':');
      const offerId = parts.length >= 4 ? parts.slice(3).join(':') : productId;
      if (offerId) ids.add(offerId);
    }
    pageToken = data.nextPageToken;
  } while (pageToken);
  return ids;
}

function needsTitleFix(title: string, offerId: string, truncated: Set<string>) {
  if (!title) return false;
  if (truncated.has(offerId)) return true;
  if (title.length >= TITLE_MAX) return true;
  if (
    title.length >= FIX_IF_LEN_AT_LEAST &&
    /\|\s*The Kashmir Weaver\b/i.test(title)
  ) {
    return true;
  }
  return false;
}

async function main() {
  console.log(`Merchant ${MERCHANT} — fix text_value_truncated titles`);

  const targets = await listWriteTargets();
  if (!targets.length) {
    console.error('No Shopify App API write targets found');
    process.exit(1);
  }
  const targetsByFeed = new Map<string, WriteTarget[]>();
  for (const t of targets) {
    console.log(`${t.kind} ${t.feedLabel} → ${t.dataSourceId}`);
    const list = targetsByFeed.get(t.feedLabel) || [];
    list.push(t);
    targetsByFeed.set(t.feedLabel, list);
  }

  const truncatedOffers = await listTruncatedOfferIds();
  console.log(`Offers with text_value_truncated status: ${truncatedOffers.size}`);

  const products = await listProducts();
  console.log(`Products: ${products.length}`);

  type Job = {
    product: McProduct;
    newTitle: string;
    oldTitle: string;
    dataSourceId: string;
  };
  const jobs: Job[] = [];
  const samples: Array<{old: string; neu: string}> = [];

  for (const p of products) {
    if (!p.offerId || !p.feedLabel) continue;
    // Local Feed Partnership products are a separate channel; online Shopping is the priority.
    if (String(p.id || '').startsWith('local:')) continue;
    const oldTitle = p.title || '';
    if (!needsTitleFix(oldTitle, p.offerId, truncatedOffers)) continue;
    const newTitle = shortenTitle(oldTitle);
    if (!newTitle || newTitle === oldTitle) continue;
    const feedTargets = targetsByFeed.get(p.feedLabel) || [];
    if (!feedTargets.length) continue;
    for (const t of feedTargets) {
      jobs.push({
        product: p,
        newTitle,
        oldTitle,
        dataSourceId: t.dataSourceId,
      });
    }
    if (samples.length < 8 && !samples.some((s) => s.old === oldTitle)) {
      samples.push({old: oldTitle, neu: newTitle});
    }
  }

  console.log(`Upserts queued: ${jobs.length}`);
  console.log(
    `Unique offers: ${new Set(jobs.map((j) => j.product.offerId)).size}`,
  );
  for (const s of samples) {
    console.log(`\n  OLD (${s.old.length}): ${s.old}`);
    console.log(`  NEW (${s.neu.length}): ${s.neu}`);
  }

  let ok = 0;
  let err = 0;
  const errSamples: string[] = [];
  const queue = [...jobs];
  const concurrency = 6;

  async function worker() {
    while (queue.length) {
      const job = queue.shift();
      if (!job) break;
      const {product: p, newTitle, dataSourceId} = job;

      const productAttributes: Record<string, unknown> = {
        title: newTitle,
        availability: mapAvailability(p.availability),
        condition: 'NEW',
      };
      if (p.link) productAttributes.link = p.link;
      if (p.canonicalLink) productAttributes.canonicalLink = p.canonicalLink;
      if (p.description) {
        productAttributes.description = p.description.slice(0, 5000);
      }
      if (p.imageLink) productAttributes.imageLink = p.imageLink;
      if (p.additionalImageLinks?.length) {
        productAttributes.additionalImageLinks = p.additionalImageLinks.slice(
          0,
          10,
        );
      }
      if (p.brand) productAttributes.brand = p.brand;
      if (p.color) productAttributes.color = p.color;
      if (p.sizes?.length) productAttributes.size = p.sizes[0];
      if (p.googleProductCategory) {
        productAttributes.googleProductCategory = p.googleProductCategory;
      }
      if (p.itemGroupId) productAttributes.itemGroupId = p.itemGroupId;
      if (p.ageGroup) productAttributes.ageGroup = 'ADULT';
      if (p.gender) productAttributes.gender = 'UNISEX';
      if (p.price) {
        productAttributes.price = {
          amountMicros: micros(p.price.value),
          currencyCode: p.price.currency,
        };
      }
      if (p.salePrice) {
        productAttributes.salePrice = {
          amountMicros: micros(p.salePrice.value),
          currencyCode: p.salePrice.currency,
        };
      }

      const body = {
        offerId: p.offerId,
        contentLanguage: p.contentLanguage || 'en',
        feedLabel: p.feedLabel,
        productAttributes,
      };

      try {
        await api(
          `https://merchantapi.googleapis.com/products/v1/accounts/${MERCHANT}/productInputs:insert?dataSource=accounts/${MERCHANT}/dataSources/${dataSourceId}`,
          {method: 'POST', body: JSON.stringify(body)},
        );
        ok++;
      } catch (e) {
        err++;
        if (errSamples.length < 8) errSamples.push(String(e));
      }
      if ((ok + err) % 25 === 0) {
        process.stdout.write(
          `\rProgress ok=${ok} err=${err} left=${queue.length}   `,
        );
      }
    }
  }

  await Promise.all(Array.from({length: concurrency}, () => worker()));
  console.log(`\nDone. ok=${ok} err=${err}`);
  if (errSamples.length) console.log('Sample errors:\n', errSamples.join('\n\n'));

  console.log('Waiting 12s for Merchant processing…');
  await new Promise((r) => setTimeout(r, 12000));

  // Re-check truncation statuses + sample titles
  const stillTruncated = await listTruncatedOfferIds();
  console.log(
    `Remaining text_value_truncated offers: ${stillTruncated.size}`,
  );
  if (stillTruncated.size) {
    console.log([...stillTruncated].slice(0, 10).join('\n'));
  }

  for (const job of jobs.slice(0, 5)) {
    const got = await api(
      `https://shoppingcontent.googleapis.com/content/v2.1/${MERCHANT}/products/${encodeURIComponent(job.product.id)}`,
    );
    console.log('verify', {
      offerId: got.offerId,
      len: (got.title || '').length,
      title: got.title,
    });
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
