/**
 * Fix Merchant Center url_does_not_match_homepage by setting product `link`
 * and `canonicalLink` to https://thekashmirweaver.shop/products/{handle}?variant={id}
 *
 * Writes into each Shopify App API primary data source (supplemental alone does
 * not reliably attach link for Shopify-synced products).
 *
 * Usage: npx tsx scripts/fix-merchant-product-links.ts
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
const STORE = (process.env.PUBLIC_STORE_URL || 'https://thekashmirweaver.shop').replace(
  /\/$/,
  '',
);

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

async function listShopifyAppApiSources(): Promise<Map<string, string>> {
  const listed = await api(
    `https://merchantapi.googleapis.com/datasources/v1/accounts/${MERCHANT}/dataSources`,
  );
  const byFeed = new Map<string, string>();
  for (const ds of listed.dataSources || []) {
    const primary = ds.primaryProductDataSource;
    const name = String(ds.displayName || '');
    if (!primary?.feedLabel) continue;
    if (!/shopify app api/i.test(name)) continue;
    byFeed.set(String(primary.feedLabel), String(ds.dataSourceId));
  }
  return byFeed;
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
    process.stdout.write(`\rFetched: ${out.length}`);
  } while (pageToken);
  console.log();
  return out;
}

async function handles(ids: string[]) {
  const map = new Map<string, string>();
  for (let i = 0; i < ids.length; i += 20) {
    const batch = ids.slice(i, i + 20);
    const data = await storefront(
      `query($ids: [ID!]!) {
        nodes(ids: $ids) {
          ... on Product { id handle }
        }
      }`,
      {ids: batch.map((id) => `gid://shopify/Product/${id}`)},
    );
    for (const n of data.nodes || []) {
      if (!n?.id || !n.handle) continue;
      map.set(n.id.split('/').pop(), n.handle);
    }
  }
  return map;
}

async function main() {
  console.log(`Merchant ${MERCHANT} → ${STORE}`);

  const dsByFeed = await listShopifyAppApiSources();
  if (!dsByFeed.size) {
    console.error('No Shopify App API primary data sources found');
    process.exit(1);
  }
  for (const [fl, id] of dsByFeed) {
    console.log(`Shopify App API ${fl} → ${id}`);
  }

  const products = await listProducts();
  console.log(`Products: ${products.length}`);
  console.log(
    `Already linked to .shop: ${
      products.filter((p) => p.link?.includes('thekashmirweaver.shop')).length
    }`,
  );

  const productIds = new Set<string>();
  for (const p of products) {
    const parts = (p.offerId || '').split('_');
    if (parts[0] === 'shopify' && parts[2]) productIds.add(parts[2]);
  }
  const handleMap = await handles([...productIds]);
  console.log(`Handles: ${handleMap.size}/${productIds.size}`);

  let ok = 0;
  let skipped = 0;
  let err = 0;
  const samples: string[] = [];
  const queue = [...products];
  const concurrency = 6;

  async function worker() {
    while (queue.length) {
      const p = queue.shift();
      if (!p?.offerId || !p.feedLabel) {
        err++;
        continue;
      }
      const ds = dsByFeed.get(p.feedLabel);
      if (!ds) {
        err++;
        if (samples.length < 8) samples.push(`no data source for feed ${p.feedLabel}`);
        continue;
      }
      const parts = p.offerId.split('_');
      if (parts.length < 4 || parts[0] !== 'shopify') {
        err++;
        continue;
      }
      const handle = handleMap.get(parts[2]);
      if (!handle) {
        err++;
        if (samples.length < 8) samples.push(`no handle for product ${parts[2]}`);
        continue;
      }

      const link = `${STORE}/products/${handle}?variant=${parts[3]}`;
      const canonicalLink = `${STORE}/products/${handle}`;
      if (p.link === link) {
        skipped++;
        continue;
      }

      const productAttributes: Record<string, unknown> = {
        link,
        canonicalLink,
        availability: mapAvailability(p.availability),
        condition: 'NEW',
      };
      if (p.title) productAttributes.title = p.title.slice(0, 150);
      if (p.description) productAttributes.description = p.description.slice(0, 5000);
      if (p.imageLink) productAttributes.imageLink = p.imageLink;
      if (p.additionalImageLinks?.length) {
        productAttributes.additionalImageLinks = p.additionalImageLinks.slice(0, 10);
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
          `https://merchantapi.googleapis.com/products/v1/accounts/${MERCHANT}/productInputs:insert?dataSource=accounts/${MERCHANT}/dataSources/${ds}`,
          {method: 'POST', body: JSON.stringify(body)},
        );
        ok++;
      } catch (e) {
        err++;
        if (samples.length < 8) samples.push(String(e));
      }
      if ((ok + skipped + err) % 50 === 0) {
        process.stdout.write(
          `\rProgress ok=${ok} skip=${skipped} err=${err} left=${queue.length}   `,
        );
      }
    }
  }

  await Promise.all(Array.from({length: concurrency}, () => worker()));
  console.log(`\nDone. ok=${ok} skip=${skipped} err=${err}`);
  if (samples.length) console.log('Sample errors:\n', samples.join('\n\n'));

  console.log('Waiting 8s for processing…');
  await new Promise((r) => setTimeout(r, 8000));

  const checks = products.slice(0, 5);
  let linked = 0;
  for (const p of checks) {
    const got = await api(
      `https://shoppingcontent.googleapis.com/content/v2.1/${MERCHANT}/products/${encodeURIComponent(p.id)}`,
    );
    if (got.link?.includes('thekashmirweaver.shop')) linked++;
    console.log('verify', {
      offerId: got.offerId,
      link: got.link,
      canonicalLink: got.canonicalLink,
    });
  }
  console.log(`Sample linked: ${linked}/${checks.length}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
