/**
 * Fix Merchant Center `low_image_quality` by replacing imageLink /
 * additionalImageLinks with the best Shopify CDN product media
 * (prefer high-res studio shots; drop sub-800px / preview crops).
 *
 * Usage: npx tsx scripts/fix-merchant-low-image-quality.ts
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

const SHOP = process.env.PUBLIC_STORE_DOMAIN!;
const STOREFRONT_TOKEN = process.env.PUBLIC_STOREFRONT_API_TOKEN!;
const MERCHANT = process.env.MERCHANT_ID || '5825882191';

if (!process.env.GOOGLE_APPLICATION_CREDENTIALS) {
  process.env.GOOGLE_APPLICATION_CREDENTIALS = `${ROOT}secrets/google/merchant-service-account.json`;
}

if (!SHOP || !STOREFRONT_TOKEN) {
  console.error('Missing PUBLIC_STORE_DOMAIN or PUBLIC_STOREFRONT_API_TOKEN');
  process.exit(1);
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

async function storefront(query: string, variables?: Record<string, unknown>) {
  const res = await fetch(`https://${SHOP}/api/2025-01/graphql.json`, {
    method: 'POST',
    headers: {
      'X-Shopify-Storefront-Access-Token': STOREFRONT_TOKEN,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({query, variables}),
  });
  const json = await res.json();
  if (json.errors?.length) throw new Error(JSON.stringify(json.errors));
  return json.data;
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

type ShopImage = {url: string; width: number; height: number; altText?: string | null};

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

/** Strip Shopify size transforms so Merchant gets the largest CDN asset. */
function cleanCdnUrl(url: string) {
  try {
    const u = new URL(url);
    // Keep version cache-buster only
    const v = u.searchParams.get('v');
    u.search = '';
    if (v) u.searchParams.set('v', v);
    return u.toString();
  } catch {
    return url;
  }
}

function filename(url: string) {
  try {
    return decodeURIComponent(new URL(url).pathname.split('/').pop() || '');
  } catch {
    return url;
  }
}

function isLikelyAiOrPreview(name: string) {
  return (
    /^g-\d/i.test(name) ||
    /pomelli|generate_hero|generate_/i.test(name) ||
    /_thumb|shade|swatch|zoom.?crop/i.test(name)
  );
}

function isStudioShot(name: string) {
  return /2k|drape|model|wrapped|plinth|walnut/i.test(name);
}

/**
 * Prefer real high-res studio shots over AI/pomelli heroes and tiny previews.
 * Google flags "one or more" images — so tiny G-* / AI additionals matter.
 */
function scoreImage(img: ShopImage) {
  const w = img.width || 0;
  const h = img.height || 0;
  const minSide = Math.min(w, h);
  const area = w * h;
  const name = filename(img.url).toLowerCase();

  let score = area;
  if (minSide < 800) score -= 50_000_000;
  if (isLikelyAiOrPreview(name)) score -= 80_000_000;
  if (isStudioShot(name)) score += 2_000_000;
  return score;
}

function pickImages(images: ShopImage[]) {
  const cleaned = images
    .filter((i) => i?.url)
    .map((i) => ({...i, url: cleanCdnUrl(i.url)}));
  // Dedupe by URL path
  const seen = new Set<string>();
  const unique: ShopImage[] = [];
  for (const img of cleaned) {
    const key = new URL(img.url).pathname;
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(img);
  }

  const ranked = [...unique].sort((a, b) => scoreImage(b) - scoreImage(a));
  const studio = ranked.filter((img) => {
    const name = filename(img.url).toLowerCase();
    return (
      Math.min(img.width || 0, img.height || 0) >= 800 &&
      !isLikelyAiOrPreview(name)
    );
  });
  const pool = studio.length ? studio : ranked;
  const primary = pool[0];
  if (!primary) return {imageLink: null as string | null, additional: [] as string[]};

  // Prefer studio-only additionals when available; never include sub-800px previews
  const additional = pool
    .slice(1)
    .filter((img) => Math.min(img.width || 0, img.height || 0) >= 800)
    .slice(0, 10)
    .map((i) => i.url);

  return {imageLink: primary.url, additional};
}

async function listWriteTargets(): Promise<
  Array<{feedLabel: string; dataSourceId: string; kind: 'primary' | 'supplemental'}>
> {
  const listed = await api(
    `https://merchantapi.googleapis.com/datasources/v1/accounts/${MERCHANT}/dataSources`,
  );
  const targets: Array<{
    feedLabel: string;
    dataSourceId: string;
    kind: 'primary' | 'supplemental';
  }> = [];
  const primaryByName = new Map<string, string>();

  for (const ds of listed.dataSources || []) {
    const primary = ds.primaryProductDataSource;
    const name = String(ds.displayName || '');
    if (!primary?.feedLabel) continue;
    if (!/shopify app api/i.test(name)) continue;
    const feedLabel = String(primary.feedLabel);
    const dataSourceId = String(ds.dataSourceId);
    targets.push({feedLabel, dataSourceId, kind: 'primary'});
    primaryByName.set(
      `accounts/${MERCHANT}/dataSources/${dataSourceId}`,
      feedLabel,
    );
  }

  for (const ds of listed.dataSources || []) {
    const supp = ds.supplementalProductDataSource;
    if (!supp) continue;
    for (const ref of supp.referencingPrimaryDataSources || []) {
      const feedLabel = primaryByName.get(String(ref.primaryDataSourceName || ''));
      if (!feedLabel) continue;
      targets.push({
        feedLabel,
        dataSourceId: String(ds.dataSourceId),
        kind: 'supplemental',
      });
    }
  }
  return targets;
}

async function listLowImageQualityOfferKeys(): Promise<
  Array<{productId: string; offerId: string; feedLabel: string; title?: string}>
> {
  const out: Array<{
    productId: string;
    offerId: string;
    feedLabel: string;
    title?: string;
  }> = [];
  let pageToken: string | undefined;
  do {
    const q = new URLSearchParams({maxResults: '250'});
    if (pageToken) q.set('pageToken', pageToken);
    const data = await api(
      `https://shoppingcontent.googleapis.com/content/v2.1/${MERCHANT}/productstatuses?${q}`,
    );
    for (const r of data.resources || []) {
      const issues = r.itemLevelIssues || [];
      if (!issues.some((it: {code?: string}) => it.code === 'low_image_quality')) {
        continue;
      }
      const productId = String(r.productId || '');
      // online:en:FEED:offerId
      const parts = productId.split(':');
      const offerId = parts.slice(3).join(':');
      const feedLabel = parts[2] || '';
      out.push({productId, offerId, feedLabel, title: r.title});
    }
    pageToken = data.nextPageToken;
  } while (pageToken);
  return out;
}

async function getMcProduct(productId: string): Promise<McProduct> {
  return api(
    `https://shoppingcontent.googleapis.com/content/v2.1/${MERCHANT}/products/${encodeURIComponent(productId)}`,
  );
}

async function fetchShopifyImages(
  productId: string,
  variantId: string,
): Promise<{handle: string; title: string; images: ShopImage[]; picked: ReturnType<typeof pickImages>}> {
  const data = await storefront(
    `query($id: ID!) {
      product: node(id: $id) {
        ... on Product {
          id
          handle
          title
          featuredImage { url width height altText }
          images(first: 25) {
            nodes { url width height altText }
          }
          variants(first: 50) {
            nodes {
              id
              image { url width height altText }
            }
          }
        }
      }
    }`,
    {id: `gid://shopify/Product/${productId}`},
  );
  const p = data.product;
  if (!p?.handle) throw new Error(`Shopify product not found: ${productId}`);

  const images: ShopImage[] = [];
  const push = (img: ShopImage | null | undefined) => {
    if (img?.url) images.push(img);
  };
  // Prefer variant image first in the list for scoring tie-breaks only via area
  const variant = (p.variants?.nodes || []).find(
    (v: {id: string}) => v.id.split('/').pop() === variantId,
  );
  push(variant?.image);
  push(p.featuredImage);
  for (const img of p.images?.nodes || []) push(img);

  return {
    handle: p.handle,
    title: p.title,
    images,
    picked: pickImages(images),
  };
}

async function main() {
  console.log(`Merchant ${MERCHANT}`);

  const targets = await listWriteTargets();
  if (!targets.some((t) => t.kind === 'primary')) {
    console.error('No Shopify App API primary data sources found');
    process.exit(1);
  }
  for (const t of targets) {
    console.log(`${t.kind} ${t.feedLabel} → ${t.dataSourceId}`);
  }

  const flagged = await listLowImageQualityOfferKeys();
  console.log(`low_image_quality statuses: ${flagged.length}`);

  // Unique offerId (update all feeds × write targets for that feed)
  const uniqueOffers = new Map<string, (typeof flagged)[0]>();
  for (const f of flagged) {
    if (!uniqueOffers.has(f.offerId)) uniqueOffers.set(f.offerId, f);
  }
  console.log(`Unique offerIds to update: ${uniqueOffers.size}`);

  const report: Array<Record<string, unknown>> = [];
  let ok = 0;
  let skip = 0;
  let err = 0;

  for (const row of uniqueOffers.values()) {
    const parts = row.offerId.split('_');
    if (parts.length < 4 || parts[0] !== 'shopify') {
      err++;
      report.push({offerId: row.offerId, error: 'bad offerId'});
      continue;
    }
    const productId = parts[2];
    const variantId = parts[3];

    const feeds = [...new Set(flagged.filter((f) => f.offerId === row.offerId).map((f) => f.feedLabel))];
    const writeTargets = targets.filter((t) => feeds.includes(t.feedLabel));
    if (!writeTargets.length) {
      err++;
      report.push({offerId: row.offerId, error: 'no data source'});
      continue;
    }

    // Use any flagged productId for MC fetch (feed-specific)
    const sample = flagged.find((f) => f.offerId === row.offerId)!;
    const mc = await getMcProduct(sample.productId);
    const shop = await fetchShopifyImages(productId, variantId);
    const {imageLink, additional} = shop.picked;

    if (!imageLink) {
      err++;
      report.push({offerId: row.offerId, error: 'no shopify image'});
      continue;
    }

    const samePrimary = cleanCdnUrl(mc.imageLink || '') === imageLink;
    const hasStudioAlt = shop.images.some((img) => {
      const name = filename(img.url).toLowerCase();
      return (
        Math.min(img.width || 0, img.height || 0) >= 1600 &&
        !isLikelyAiOrPreview(name)
      );
    });
    if (samePrimary && !hasStudioAlt) {
      skip++;
      report.push({
        offerId: row.offerId,
        title: shop.title,
        status: 'unchanged',
        imageLink,
        note: 'No higher-res non-AI Shopify media available — upload studio shots in Shopify',
      });
      continue;
    }

    const fullAttrs: Record<string, unknown> = {
      availability: mapAvailability(mc.availability),
      condition: 'NEW',
      imageLink,
    };
    if (additional.length) fullAttrs.additionalImageLinks = additional;
    if (mc.title) fullAttrs.title = mc.title.slice(0, 150);
    if (mc.description) fullAttrs.description = mc.description.slice(0, 5000);
    if (mc.link) fullAttrs.link = mc.link;
    if (mc.canonicalLink) fullAttrs.canonicalLink = mc.canonicalLink;
    if (mc.brand) fullAttrs.brand = mc.brand;
    if (mc.color) fullAttrs.color = mc.color;
    if (mc.sizes?.length) fullAttrs.size = mc.sizes[0];
    if (mc.googleProductCategory) {
      fullAttrs.googleProductCategory = mc.googleProductCategory;
    }
    if (mc.itemGroupId) fullAttrs.itemGroupId = mc.itemGroupId;
    if (mc.ageGroup) fullAttrs.ageGroup = 'ADULT';
    if (mc.gender) fullAttrs.gender = 'UNISEX';
    if (mc.price) {
      fullAttrs.price = {
        amountMicros: micros(mc.price.value),
        currencyCode: mc.price.currency,
      };
    }
    if (mc.salePrice) {
      fullAttrs.salePrice = {
        amountMicros: micros(mc.salePrice.value),
        currencyCode: mc.salePrice.currency,
      };
    }

    // Supplemental: images only (avoids clobbering link/title work from other agents)
    const imageOnlyAttrs: Record<string, unknown> = {imageLink};
    if (additional.length) imageOnlyAttrs.additionalImageLinks = additional;

    let rowOk = 0;
    for (const t of writeTargets) {
      const productAttributes = t.kind === 'supplemental' ? imageOnlyAttrs : fullAttrs;
      const body = {
        offerId: row.offerId,
        contentLanguage: mc.contentLanguage || 'en',
        feedLabel: t.feedLabel,
        productAttributes,
      };
      try {
        await api(
          `https://merchantapi.googleapis.com/products/v1/accounts/${MERCHANT}/productInputs:insert?dataSource=accounts/${MERCHANT}/dataSources/${t.dataSourceId}`,
          {method: 'POST', body: JSON.stringify(body)},
        );
        rowOk++;
      } catch (e) {
        err++;
        report.push({
          offerId: row.offerId,
          feedLabel: t.feedLabel,
          dataSourceId: t.dataSourceId,
          error: String(e),
        });
        console.error('ERR', row.offerId, t.kind, e);
      }
    }

    if (rowOk) {
      ok++;
      report.push({
        offerId: row.offerId,
        title: shop.title,
        status: 'updated',
        writes: rowOk,
        oldImageLink: mc.imageLink,
        newImageLink: imageLink,
        additionalCount: additional.length,
      });
      console.log(
        `OK ${row.offerId} (${rowOk} writes)\n  old: ${mc.imageLink}\n  new: ${imageLink}`,
      );
    }
  }

  console.log(`\nDone. ok=${ok} skip=${skip} err=${err}`);
  console.log(JSON.stringify(report, null, 2));

  console.log('\nWaiting 12s then re-checking product imageLinks…');
  await new Promise((r) => setTimeout(r, 12000));

  for (const row of flagged) {
    const got = await getMcProduct(row.productId);
    console.log('verify', {
      offerId: got.offerId,
      feedLabel: got.feedLabel,
      imageLink: got.imageLink,
      additionalCount: got.additionalImageLinks?.length || 0,
    });
  }

  // Re-scan statuses (may lag)
  const still = await listLowImageQualityOfferKeys();
  const stillOffers = [...new Set(still.map((s) => s.offerId))];
  console.log(
    `\nlow_image_quality still present for ${stillOffers.length} offerIds (may lag):`,
    stillOffers,
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
