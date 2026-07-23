/**
 * Fix Merchant Center missing_item_attribute_for_product_type /
 * item_missing_required_attribute (typically age_group, gender, color, image_link).
 *
 * Only touches offers that currently have those issue codes. Writes a surgical
 * productInputs:insert into:
 *   1. The Shopify App API primary for that feedLabel
 *   2. The "Hydrogen link overrides" supplemental data source
 *
 * Ensures the primary defaultRule takes from self then supplemental so Shopify
 * gaps (empty image / age / gender) are filled without wiping other fields.
 *
 * Usage: npx tsx scripts/fix-merchant-missing-attributes.ts
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
const STOREFRONT_TOKEN = process.env.PUBLIC_STOREFRONT_API_TOKEN!;
const MERCHANT = process.env.MERCHANT_ID || '5825882191';
const STORE = (process.env.PUBLIC_STORE_URL || 'https://thekashmirweaver.shop').replace(
  /\/$/,
  '',
);
const ISSUE_CODES = new Set([
  'missing_item_attribute_for_product_type',
  'item_missing_required_attribute',
]);

if (!process.env.GOOGLE_APPLICATION_CREDENTIALS) {
  process.env.GOOGLE_APPLICATION_CREDENTIALS = resolve(
    ROOT,
    'secrets/google/merchant-service-account.json',
  );
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

type StatusHit = {
  productId: string;
  offerId: string;
  feedLabel: string;
  missingAttrs: Set<string>;
};

async function listMissingAttributeHits(): Promise<StatusHit[]> {
  const hits: StatusHit[] = [];
  let pageToken: string | undefined;
  do {
    const q = new URLSearchParams({maxResults: '250'});
    if (pageToken) q.set('pageToken', pageToken);
    const data = await api(
      `https://shoppingcontent.googleapis.com/content/v2.1/${MERCHANT}/productstatuses?${q}`,
    );
    for (const s of data.resources || []) {
      const issues = (s.itemLevelIssues || []).filter((i: {code?: string}) =>
        ISSUE_CODES.has(String(i.code)),
      );
      if (!issues.length) continue;
      const productId = String(s.productId || '');
      // online:en:FEED:offerId
      const parts = productId.split(':');
      const offerId = parts.slice(3).join(':');
      const feedLabel = parts[2];
      if (!offerId || !feedLabel) continue;
      hits.push({
        productId,
        offerId,
        feedLabel,
        missingAttrs: new Set(
          issues
            .map((i: {attributeName?: string}) =>
              String(i.attributeName || '').toLowerCase(),
            )
            .filter(Boolean),
        ),
      });
    }
    pageToken = data.nextPageToken;
  } while (pageToken);
  return hits;
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

async function findSupplementalId(): Promise<string | null> {
  const listed = await api(
    `https://merchantapi.googleapis.com/datasources/v1/accounts/${MERCHANT}/dataSources`,
  );
  for (const ds of listed.dataSources || []) {
    if (
      ds.supplementalProductDataSource &&
      /hydrogen|override/i.test(String(ds.displayName || ''))
    ) {
      return String(ds.dataSourceId);
    }
  }
  return null;
}

async function ensurePrimaryTakesSupplemental(
  primaryId: string,
  supplementalId: string,
) {
  const ds = await api(
    `https://merchantapi.googleapis.com/datasources/v1/accounts/${MERCHANT}/dataSources/${primaryId}`,
  );
  const rule = ds.primaryProductDataSource?.defaultRule?.takeFromDataSources || [];
  const hasSupp = rule.some(
    (r: {supplementalDataSourceName?: string}) =>
      String(r.supplementalDataSourceName || '').includes(supplementalId),
  );
  if (hasSupp) return false;
  await api(
    `https://merchantapi.googleapis.com/datasources/v1/accounts/${MERCHANT}/dataSources/${primaryId}?updateMask=primaryProductDataSource.defaultRule`,
    {
      method: 'PATCH',
      body: JSON.stringify({
        primaryProductDataSource: {
          defaultRule: {
            takeFromDataSources: [
              {self: true},
              {
                supplementalDataSourceName: `accounts/${MERCHANT}/dataSources/${supplementalId}`,
              },
            ],
          },
        },
      }),
    },
  );
  return true;
}

type ShopifyVariantInfo = {
  imageLink: string | null;
  additionalImageLinks: string[];
  color: string | null;
  size: string | null;
  handle: string | null;
  title: string | null;
};

async function shopifyVariantInfo(
  productId: string,
  variantId: string,
): Promise<ShopifyVariantInfo> {
  const data = await storefront(
    `query($id: ID!) {
      product(id: $id) {
        handle
        title
        featuredImage { url }
        images(first: 5) { nodes { url } }
        variants(first: 50) {
          nodes {
            id
            image { url }
            selectedOptions { name value }
          }
        }
      }
    }`,
    {id: `gid://shopify/Product/${productId}`},
  );
  const product = data.product;
  if (!product) {
    return {
      imageLink: null,
      additionalImageLinks: [],
      color: null,
      size: null,
      handle: null,
      title: null,
    };
  }
  const variant = (product.variants?.nodes || []).find(
    (v: {id: string}) => v.id.endsWith(`/${variantId}`),
  );
  const color =
    variant?.selectedOptions?.find(
      (o: {name: string}) => o.name.toLowerCase() === 'color',
    )?.value || null;
  const size =
    variant?.selectedOptions?.find((o: {name: string}) =>
      /size|dimension|length|accessory/i.test(o.name),
    )?.value || null;
  const imageLink =
    variant?.image?.url || product.featuredImage?.url || null;
  const additionalImageLinks = (product.images?.nodes || [])
    .map((n: {url: string}) => n.url)
    .filter((u: string) => u && u !== imageLink)
    .slice(0, 10);
  return {
    imageLink,
    additionalImageLinks,
    color,
    size,
    handle: product.handle || null,
    title: product.title || null,
  };
}

async function upsert(
  dataSourceId: string,
  offerId: string,
  feedLabel: string,
  productAttributes: Record<string, unknown>,
) {
  const body = {
    offerId,
    contentLanguage: 'en',
    feedLabel,
    productAttributes,
  };
  await api(
    `https://merchantapi.googleapis.com/products/v1/accounts/${MERCHANT}/productInputs:insert?dataSource=accounts/${MERCHANT}/dataSources/${dataSourceId}`,
    {method: 'POST', body: JSON.stringify(body)},
  );
}

async function main() {
  console.log(`Merchant ${MERCHANT} missing-attribute fix`);

  const dsByFeed = await listShopifyAppApiSources();
  const supplementalId = await findSupplementalId();
  if (!dsByFeed.size) {
    console.error('No Shopify App API primary data sources found');
    process.exit(1);
  }
  for (const [fl, id] of dsByFeed) {
    console.log(`Shopify App API ${fl} → ${id}`);
  }
  console.log(`Supplemental → ${supplementalId || '(none)'}`);

  const hits = await listMissingAttributeHits();
  console.log(`Offers with missing-attr codes: ${hits.length}`);
  if (!hits.length) return;

  // Deduplicate by offerId+feedLabel
  const unique = new Map<string, StatusHit>();
  for (const h of hits) unique.set(`${h.feedLabel}:${h.offerId}`, h);

  let ok = 0;
  let err = 0;
  const samples: string[] = [];

  for (const hit of unique.values()) {
    const primaryId = dsByFeed.get(hit.feedLabel);
    if (!primaryId) {
      err++;
      samples.push(`no primary DS for ${hit.feedLabel}`);
      continue;
    }
    if (supplementalId) {
      const patched = await ensurePrimaryTakesSupplemental(
        primaryId,
        supplementalId,
      );
      if (patched) {
        console.log(`Patched primary ${primaryId} to take supplemental`);
      }
    }

    const parts = hit.offerId.split('_');
    if (parts.length < 4 || parts[0] !== 'shopify') {
      err++;
      samples.push(`bad offerId ${hit.offerId}`);
      continue;
    }
    const productId = parts[2];
    const variantId = parts[3];

    const mc = await api(
      `https://shoppingcontent.googleapis.com/content/v2.1/${MERCHANT}/products/${encodeURIComponent(hit.productId)}`,
    );
    const shop = await shopifyVariantInfo(productId, variantId);

    const needsImage =
      hit.missingAttrs.has('image link') || !mc.imageLink;
    const imageLink = needsImage
      ? shop.imageLink || mc.imageLink
      : mc.imageLink || shop.imageLink;

    const productAttributes: Record<string, unknown> = {
      availability: mapAvailability(mc.availability),
      condition: 'NEW',
      ageGroup: 'ADULT',
      gender: 'UNISEX',
    };
    if (mc.title) productAttributes.title = String(mc.title).slice(0, 150);
    else if (shop.title) productAttributes.title = shop.title.slice(0, 150);
    if (mc.link) productAttributes.link = mc.link;
    else if (shop.handle) {
      productAttributes.link = `${STORE}/products/${shop.handle}?variant=${variantId}`;
      productAttributes.canonicalLink = `${STORE}/products/${shop.handle}`;
    }
    if (mc.canonicalLink) productAttributes.canonicalLink = mc.canonicalLink;
    if (imageLink) productAttributes.imageLink = imageLink;
    if (shop.additionalImageLinks.length) {
      productAttributes.additionalImageLinks = shop.additionalImageLinks;
    } else if (mc.additionalImageLinks?.length) {
      productAttributes.additionalImageLinks = mc.additionalImageLinks.slice(
        0,
        10,
      );
    }
    if (mc.brand) productAttributes.brand = mc.brand;
    const color = mc.color || shop.color;
    if (color) productAttributes.color = color;
    const size = mc.sizes?.[0] || shop.size;
    if (size) productAttributes.size = size;
    if (mc.googleProductCategory) {
      productAttributes.googleProductCategory = mc.googleProductCategory;
    }
    if (mc.itemGroupId) productAttributes.itemGroupId = mc.itemGroupId;
    else productAttributes.itemGroupId = productId;
    if (mc.price) {
      productAttributes.price = {
        amountMicros: micros(mc.price.value),
        currencyCode: mc.price.currency,
      };
    }

    console.log(
      `Fix ${hit.offerId} @ ${hit.feedLabel} missing=[${[...hit.missingAttrs].join(', ')}] image=${Boolean(imageLink)}`,
    );

    try {
      await upsert(primaryId, hit.offerId, hit.feedLabel, productAttributes);
      if (supplementalId) {
        await upsert(
          supplementalId,
          hit.offerId,
          hit.feedLabel,
          productAttributes,
        );
      }
      ok++;
    } catch (e) {
      err++;
      if (samples.length < 8) samples.push(String(e));
    }
  }

  console.log(`Done. ok=${ok} err=${err}`);
  if (samples.length) console.log('Samples:\n', samples.join('\n\n'));

  console.log('Waiting 12s for processing…');
  await new Promise((r) => setTimeout(r, 12000));

  let remaining = 0;
  for (const hit of unique.values()) {
    const st = await api(
      `https://shoppingcontent.googleapis.com/content/v2.1/${MERCHANT}/productstatuses/${encodeURIComponent(hit.productId)}`,
    );
    const still = (st.itemLevelIssues || []).filter((i: {code?: string}) =>
      ISSUE_CODES.has(String(i.code)),
    );
    const p = await api(
      `https://shoppingcontent.googleapis.com/content/v2.1/${MERCHANT}/products/${encodeURIComponent(hit.productId)}`,
    );
    console.log('verify', {
      offerId: hit.offerId,
      feedLabel: hit.feedLabel,
      imageLink: p.imageLink,
      ageGroup: p.ageGroup,
      gender: p.gender,
      color: p.color,
      remainingIssues: still.map(
        (i: {code?: string; attributeName?: string}) =>
          `${i.code}:${i.attributeName}`,
      ),
    });
    if (still.length) remaining++;
  }
  console.log(`Remaining with missing-attr issues: ${remaining}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
