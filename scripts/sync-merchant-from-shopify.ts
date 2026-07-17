/**
 * Keep Google Merchant Center in sync with Shopify:
 * 1. Fix missing Shopify taxonomy category on known gaps
 * 2. Supplemental Content API productInputs for every active variant × feed label:
 *    storefront link, brand, mpn, color, size, category, itemGroupId, identifierExists=false
 *
 * Usage: npx tsx scripts/sync-merchant-from-shopify.ts
 */
import {existsSync, readFileSync} from 'node:fs';
import {dirname, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {execFileSync} from 'node:child_process';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

function loadEnv() {
  const envPath = resolve(ROOT, '.env');
  if (!existsSync(envPath)) return;
  for (const line of readFileSync(envPath, 'utf8').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (process.env[key] === undefined) process.env[key] = value;
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
const BRAND = 'The Kashmir Weaver';
const GOOGLE_CATEGORY =
  'Apparel & Accessories > Clothing Accessories > Scarves & Shawls';
const TAXONOMY_SCARVES = 'gid://shopify/TaxonomyCategory/aa-2-26';

if (!process.env.GOOGLE_APPLICATION_CREDENTIALS) {
  process.env.GOOGLE_APPLICATION_CREDENTIALS = resolve(
    ROOT,
    'secrets/google/merchant-service-account.json',
  );
}

if (!SHOP || !ADMIN) {
  console.error('Missing PUBLIC_STORE_DOMAIN or SHOPIFY_ADMIN_ACCESS_TOKEN');
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

type ShopVariant = {
  productId: string;
  variantId: string;
  handle: string;
  title: string;
  description: string;
  imageLink: string | null;
  sku: string | null;
  barcode: string | null;
  mpn: string | null;
  color: string | null;
  size: string | null;
  price: string | null;
  currency: string;
  availability: 'IN_STOCK' | 'OUT_OF_STOCK';
  category: string;
};

async function fixShopifyCategoryGaps() {
  const data = await shopify(`{
    products(first: 50, query: "status:active AND -category:*") {
      edges { node { id handle title category { id } } }
    }
  }`);
  const gaps = (data.products?.edges || [])
    .map((e: {node: {id: string; handle: string; category: unknown}}) => e.node)
    .filter((p: {category: unknown}) => !p.category);

  // Also fix the known chocolate-brown product if query misses it
  const known = await shopify(
    `query($h: String!) {
      productByHandle(handle: $h) { id handle category { id } }
    }`,
    {h: 'chocolate-brown-cashmere-pashmina-shawl-handwoven-in-kashmir'},
  );
  if (known.productByHandle && !known.productByHandle.category) {
    gaps.push(known.productByHandle);
  }

  const seen = new Set<string>();
  for (const p of gaps) {
    if (seen.has(p.id)) continue;
    seen.add(p.id);
    const result = await shopify(
      `mutation($product: ProductUpdateInput!) {
        productUpdate(product: $product) {
          product { id handle category { fullName } }
          userErrors { field message }
        }
      }`,
      {product: {id: p.id, category: TAXONOMY_SCARVES}},
    );
    const errs = result.productUpdate?.userErrors || [];
    if (errs.length) {
      console.warn(`Category fix failed ${p.handle}:`, errs);
    } else {
      console.log(
        `Category set: ${p.handle} → ${result.productUpdate.product.category?.fullName}`,
      );
    }
  }
  if (!seen.size) console.log('Shopify category gaps: none');
}

type DataSourceTarget = {
  dataSourceId: string;
  feedLabel: string;
  displayName: string;
  kind: 'primary' | 'supplemental';
};

/** Prefer Content API + Shopify App API primaries + Hydrogen supplemental overrides. */
async function resolveWriteTargets(): Promise<DataSourceTarget[]> {
  const listed = await api(
    `https://merchantapi.googleapis.com/datasources/v1/accounts/${MERCHANT}/dataSources`,
  );
  const targets: DataSourceTarget[] = [];
  for (const ds of listed.dataSources || []) {
    const id = String(ds.dataSourceId);
    const displayName = String(ds.displayName || '');
    const primary = ds.primaryProductDataSource;
    const isSupplemental = Boolean(ds.supplementalProductDataSource);
    if (isSupplemental && /hydrogen|override/i.test(displayName)) {
      // Supplemental applies across feeds; write once per known feed label below.
      continue;
    }
    if (!primary?.feedLabel) continue;
    const feedLabel = String(primary.feedLabel);
    const isContent = /content api/i.test(displayName);
    const isShopifyApp = /shopify app api/i.test(displayName);
    if (isContent || isShopifyApp) {
      targets.push({
        dataSourceId: id,
        feedLabel,
        displayName,
        kind: 'primary',
      });
    }
  }

  const supplemental = (listed.dataSources || []).find(
    (ds: {supplementalProductDataSource?: unknown; displayName?: string}) =>
      ds.supplementalProductDataSource &&
      /hydrogen|override/i.test(String(ds.displayName || '')),
  );
  if (supplemental) {
    const feedLabels = [...new Set(targets.map((t) => t.feedLabel))];
    for (const feedLabel of feedLabels) {
      targets.push({
        dataSourceId: String(supplemental.dataSourceId),
        feedLabel,
        displayName: String(supplemental.displayName || 'Hydrogen overrides'),
        kind: 'supplemental',
      });
    }
  }

  return targets;
}

async function loadShopifyVariants(): Promise<ShopVariant[]> {
  const out: ShopVariant[] = [];
  let after: string | null = null;
  do {
    const data = await shopify(
      `query($c: String) {
        products(first: 50, after: $c, query: "status:active") {
          pageInfo { hasNextPage endCursor }
          edges {
            node {
              id
              handle
              title
              description
              category { fullName }
              featuredImage { url }
              variants(first: 100) {
                edges {
                  node {
                    id
                    title
                    sku
                    barcode
                    availableForSale
                    price
                    selectedOptions { name value }
                    image { url }
                    metafields(first: 15, namespace: "mm-google-shopping") {
                      edges { node { key value } }
                    }
                  }
                }
              }
            }
          }
        }
      }`,
      {c: after},
    );

    for (const edge of data.products.edges) {
      const p = edge.node;
      for (const ve of p.variants.edges) {
        const v = ve.node;
        const mf = Object.fromEntries(
          (v.metafields?.edges || []).map(
            (e: {node: {key: string; value: string}}) => [e.node.key, e.node.value],
          ),
        );
        const colorOpt = v.selectedOptions.find(
          (o: {name: string}) => o.name.toLowerCase() === 'color',
        )?.value;
        const sizeOpt =
          v.selectedOptions.find((o: {name: string}) =>
            /size|dimension|length/i.test(o.name),
          )?.value ||
          v.selectedOptions.find(
            (o: {name: string}) => o.name.toLowerCase() !== 'color',
          )?.value ||
          null;

        out.push({
          productId: p.id.split('/').pop(),
          variantId: v.id.split('/').pop(),
          handle: p.handle,
          title: p.title,
          description: (p.description || '').slice(0, 5000),
          imageLink: v.image?.url || p.featuredImage?.url || null,
          sku: v.sku || null,
          barcode: v.barcode || null,
          mpn: mf.mpn || v.sku || null,
          color: mf.color || colorOpt || null,
          size: sizeOpt,
          price: v.price != null ? String(v.price) : null,
          currency: 'USD',
          availability: v.availableForSale ? 'IN_STOCK' : 'OUT_OF_STOCK',
          category: p.category?.fullName || GOOGLE_CATEGORY,
        });
      }
    }
    after = data.products.pageInfo.hasNextPage
      ? data.products.pageInfo.endCursor
      : null;
  } while (after);
  return out;
}

function micros(value: string) {
  return String(Math.round(parseFloat(value) * 1_000_000));
}

async function main() {
  console.log(`Sync Merchant ${MERCHANT} ← Shopify ${SHOP} → ${STORE}`);

  await fixShopifyCategoryGaps();

  const targets = await resolveWriteTargets();
  if (!targets.length) {
    console.error('No writable Merchant data sources found');
    process.exit(1);
  }
  for (const t of targets) {
    console.log(`Target ${t.kind}: ${t.displayName} (${t.feedLabel}) → ${t.dataSourceId}`);
  }

  const variants = await loadShopifyVariants();
  console.log(`Shopify active variants: ${variants.length}`);

  type Job = {variant: ShopVariant; feedLabel: string; dataSourceId: string};
  const jobs: Job[] = [];
  for (const t of targets) {
    for (const variant of variants) {
      jobs.push({
        variant,
        feedLabel: t.feedLabel,
        dataSourceId: t.dataSourceId,
      });
    }
  }
  console.log(`Upserts to run: ${jobs.length}`);

  let ok = 0;
  let err = 0;
  const samples: string[] = [];
  const queue = [...jobs];
  const concurrency = 6;

  async function worker() {
    while (queue.length) {
      const job = queue.shift();
      if (!job) break;
      const {variant: v, feedLabel, dataSourceId} = job;
      const offerId = `shopify_ZZ_${v.productId}_${v.variantId}`;
      const link = `${STORE}/products/${v.handle}?variant=${v.variantId}`;

      const productAttributes: Record<string, unknown> = {
        link,
        title: v.title,
        brand: BRAND,
        condition: 'NEW',
        availability: v.availability,
        identifierExists: false,
        itemGroupId: v.productId,
        googleProductCategory: v.category || GOOGLE_CATEGORY,
        ageGroup: 'ADULT',
        gender: 'UNISEX',
      };
      if (v.description) productAttributes.description = v.description;
      if (v.imageLink) productAttributes.imageLink = v.imageLink;
      if (v.mpn) productAttributes.mpn = v.mpn;
      if (v.color) productAttributes.color = v.color;
      if (v.size) productAttributes.size = v.size;
      if (v.price) {
        productAttributes.price = {
          amountMicros: micros(v.price),
          currencyCode: v.currency,
        };
      }

      const body = {
        offerId,
        contentLanguage: 'en',
        feedLabel,
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
        if (samples.length < 8) samples.push(`${offerId} ${feedLabel}: ${e}`);
      }
      if ((ok + err) % 50 === 0) {
        process.stdout.write(
          `\rProgress ok=${ok} err=${err} left=${queue.length}   `,
        );
      }
    }
  }

  await Promise.all(Array.from({length: concurrency}, () => worker()));
  console.log(`\nDone. ok=${ok} err=${err}`);
  if (samples.length) console.log('Sample errors:\n', samples.join('\n\n'));

  const feedLabels = [...new Set(targets.map((t) => t.feedLabel))];
  const checks = [
    'shopify_ZZ_9326382022871_49426510610647',
    'shopify_ZZ_9326146388183_49424416735447',
  ];
  for (const offerId of checks) {
    for (const fl of feedLabels) {
      const id = `online:en:${fl}:${offerId}`;
      try {
        const got = await api(
          `https://shoppingcontent.googleapis.com/content/v2.1/${MERCHANT}/products/${encodeURIComponent(id)}`,
        );
        console.log('verify', id, {
          link: got.link,
          brand: got.brand,
          mpn: got.mpn,
          color: got.color,
          identifierExists: got.identifierExists,
        });
      } catch (e) {
        console.warn('verify failed', id, String(e).slice(0, 200));
      }
    }
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
