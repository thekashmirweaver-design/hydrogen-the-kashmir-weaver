/**
 * Fix Merchant Center url_does_not_match_homepage by setting product `link`
 * to https://thekashmirweaver.shop/products/{handle}?variant={id}
 * via Merchant API productInputs on Content API data sources.
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
    if (!(m[1] in process.env)) process.env[m[1]] = m[2];
  }
}
loadEnv();

const SHOP = process.env.PUBLIC_STORE_DOMAIN!;
const ADMIN = process.env.SHOPIFY_ADMIN_ACCESS_TOKEN!;
const MERCHANT = process.env.MERCHANT_ID || '5825882191';
const STORE = (process.env.PUBLIC_STORE_URL || 'https://thekashmirweaver.shop').replace(
  /\/$/,
  '',
);

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

async function api(url: string, init?: RequestInit) {
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
  if (!res.ok) throw new Error(`${res.status} ${url}: ${text.slice(0, 1000)}`);
  return data;
}

async function shopify(query: string, variables?: Record<string, unknown>) {
  const res = await fetch(`https://${SHOP}/admin/api/2025-01/graphql.json`, {
    method: 'POST',
    headers: {
      'X-Shopify-Access-Token': ADMIN,
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
  availability?: string;
  condition?: string;
  brand?: string;
  price?: {value: string; currency: string};
  link?: string;
};

async function ensureContentApiDataSource(feedLabel: string): Promise<string> {
  const listed = await api(
    `https://merchantapi.googleapis.com/datasources/v1/accounts/${MERCHANT}/dataSources`,
  );
  for (const ds of listed.dataSources || []) {
    const primary = ds.primaryProductDataSource;
    if (
      primary?.feedLabel === feedLabel &&
      ds.displayName?.includes('Content API')
    ) {
      return String(ds.dataSourceId);
    }
  }
  const created = await api(
    `https://merchantapi.googleapis.com/datasources/v1/accounts/${MERCHANT}/dataSources`,
    {
      method: 'POST',
      body: JSON.stringify({
        displayName: `Content API ${feedLabel}`,
        primaryProductDataSource: {
          feedLabel,
          contentLanguage: 'en',
          destinations: [
            {destination: 'FREE_LISTINGS', state: 'ENABLED'},
            {destination: 'SHOPPING_ADS', state: 'ENABLED'},
            {destination: 'DISPLAY_ADS', state: 'ENABLED'},
          ],
        },
      }),
    },
  );
  console.log(`Created Content API data source for ${feedLabel}:`, created.dataSourceId);
  return String(created.dataSourceId);
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
  for (let i = 0; i < ids.length; i += 50) {
    const batch = ids.slice(i, i + 50);
    const data = await shopify(
      `query($ids: [ID!]!) {
        nodes(ids: $ids) { ... on Product { id handle } }
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

function micros(value: string) {
  return String(Math.round(parseFloat(value) * 1_000_000));
}

async function main() {
  console.log(`Merchant ${MERCHANT} → ${STORE}`);

  const products = await listProducts();
  console.log(`Products: ${products.length}`);
  console.log(`Already linked: ${products.filter((p) => p.link?.includes('thekashmirweaver.shop')).length}`);

  const feedLabels = [...new Set(products.map((p) => p.feedLabel).filter(Boolean))] as string[];
  const dsByFeed = new Map<string, string>();
  for (const fl of feedLabels) {
    dsByFeed.set(fl, await ensureContentApiDataSource(fl));
    console.log(`Data source ${fl} → ${dsByFeed.get(fl)}`);
  }

  const productIds = new Set<string>();
  for (const p of products) {
    const parts = (p.offerId || '').split('_');
    if (parts[0] === 'shopify' && parts[2]) productIds.add(parts[2]);
  }
  const handleMap = await handles([...productIds]);
  console.log(`Handles: ${handleMap.size}/${productIds.size}`);

  let ok = 0;
  let err = 0;
  const samples: string[] = [];

  // Concurrent inserts with a small pool
  const queue = [...products];
  const concurrency = 8;

  async function worker() {
    while (queue.length) {
      const p = queue.shift();
      if (!p?.offerId || !p.feedLabel) {
        err++;
        continue;
      }
      const parts = p.offerId.split('_');
      if (parts.length < 4 || parts[0] !== 'shopify') {
        err++;
        continue;
      }
      const handle = handleMap.get(parts[2]);
      const ds = dsByFeed.get(p.feedLabel);
      if (!handle || !ds) {
        err++;
        continue;
      }
      const link = `${STORE}/products/${handle}?variant=${parts[3]}`;
      if (p.link === link) {
        ok++;
        continue;
      }

      const body: Record<string, unknown> = {
        offerId: p.offerId,
        contentLanguage: p.contentLanguage || 'en',
        feedLabel: p.feedLabel,
        productAttributes: {
          link,
          ...(p.title ? {title: p.title} : {}),
          ...(p.description ? {description: p.description.slice(0, 5000)} : {}),
          ...(p.imageLink ? {imageLink: p.imageLink} : {}),
          availability: 'IN_STOCK',
          condition: 'NEW',
          ...(p.brand ? {brand: p.brand} : {}),
          ...(p.price
            ? {
                price: {
                  amountMicros: micros(p.price.value),
                  currencyCode: p.price.currency,
                },
              }
            : {}),
        },
      };

      try {
        await api(
          `https://merchantapi.googleapis.com/products/v1/accounts/${MERCHANT}/productInputs:insert?dataSource=accounts/${MERCHANT}/dataSources/${ds}`,
          {method: 'POST', body: JSON.stringify(body)},
        );
        ok++;
      } catch (e) {
        err++;
        if (samples.length < 5) samples.push(String(e));
      }
      if ((ok + err) % 50 === 0) {
        process.stdout.write(`\rProgress ok=${ok} err=${err} left=${queue.length}   `);
      }
    }
  }

  await Promise.all(Array.from({length: concurrency}, () => worker()));
  console.log(`\nDone. ok=${ok} err=${err}`);
  if (samples.length) console.log('Sample errors:\n', samples.join('\n\n'));

  // Verify a few
  const checks = products.slice(0, 3);
  for (const p of checks) {
    const got = await api(
      `https://shoppingcontent.googleapis.com/content/v2.1/${MERCHANT}/products/${encodeURIComponent(p.id)}`,
    );
    console.log('link:', got.link);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
