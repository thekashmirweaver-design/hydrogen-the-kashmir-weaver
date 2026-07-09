/**
 * Backfill missing fields on product gid://shopify/Product/9324351652055
 * (handle: crimson-red-cashmere-pashmina-shawl-handwoven-in-kashmir-4):
 *   - On the 3 existing variants: set inventoryItem countryCodeOfOrigin=IN,
 *     harmonizedSystemCode=6214.20, measurement weight per
 *     weightGramsForSizeLabel (Stole 180g, Shawl 220g, Square 200g).
 *   - On the new 3 Yard variant: set weight to 300 g (country/HS already
 *     set in the first test run).
 *   - Set 4 Google metafields on each of the 4 variants:
 *     mm-google-shopping.age_group=adult, condition=new, gender=unisex,
 *     mpn=<own sku>.
 *   - Definitions under mm-google-shopping.* already exist on the store
 *     from the v2 script run, so this script does NOT create them.
 *
 * Run: npx tsx scripts/test-product-1-backfill-fields.ts
 */
import {existsSync, readFileSync} from 'node:fs';
import {dirname, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {weightGramsForSizeLabel} from '../app/models/product-accordion-content.ts';

function loadEnvFile() {
  const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
  const envPath = resolve(root, '.env');
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
    )
      value = value.slice(1, -1);
    if (process.env[key] === undefined) process.env[key] = value;
  }
}
loadEnvFile();

const SHOP = process.env.PUBLIC_STORE_DOMAIN ?? '';
const TOKEN = process.env.SHOPIFY_ADMIN_ACCESS_TOKEN ?? '';
const API_VERSION = '2025-01';
const PRODUCT_GID = 'gid://shopify/Product/9324351652055';

const THREE_YARD_LABEL = '3 Yard (137 × 274 cm)';
const THREE_YARD_WEIGHT_GRAMS = 300;
const COUNTRY = 'IN';
const HS = '6214.20';

const GOOGLE = {
  age_group: 'adult',
  condition: 'new',
  gender: 'unisex',
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

if (!SHOP || !TOKEN) {
  console.error('Missing env: PUBLIC_STORE_DOMAIN, SHOPIFY_ADMIN_ACCESS_TOKEN');
  process.exit(1);
}

async function adminGraphql(query, variables) {
  const res = await fetch(
    `https://${SHOP}/admin/api/${API_VERSION}/graphql.json`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Access-Token': TOKEN,
      },
      body: JSON.stringify({query, variables}),
    },
  );
  const json = await res.json();
  if (json.errors?.length) throw new Error(JSON.stringify(json.errors));
  return json;
}

async function fetchProduct() {
  const data = await adminGraphql(
    `#graphql
    query GetProduct($id: ID!) {
      product(id: $id) {
        id handle
        options { id name values }
        variants(first: 50) {
          nodes {
            id title sku barcode price compareAtPrice
            selectedOptions { name value }
            inventoryItem {
              id tracked
              unitCost { amount currencyCode }
              countryCodeOfOrigin
              harmonizedSystemCode
              measurement { weight { value unit } }
            }
          }
        }
      }
    }`,
    {id: PRODUCT_GID},
  );
  return data.data.product;
}

async function updateInventoryItem({
  id,
  country,
  hs,
  weightGrams,
}) {
  return adminGraphql(
    `#graphql
    mutation UpdateItem($id: ID!, $input: InventoryItemInput!) {
      inventoryItemUpdate(id: $id, input: $input) {
        inventoryItem {
          id
          unitCost { amount currencyCode }
          countryCodeOfOrigin
          harmonizedSystemCode
          measurement { weight { value unit } }
        }
        userErrors { field message }
      }
    }`,
    {
      id,
      input: {
        countryCodeOfOrigin: country,
        harmonizedSystemCode: hs,
        measurement: {weight: {value: weightGrams, unit: 'GRAMS'}},
      },
    },
  );
}

async function setVariantGoogleMetafields(variants) {
  const entries = [];
  for (const v of variants) {
    const sku = v.sku;
    if (!sku) continue;
    entries.push(
      {ownerId: v.id, namespace: 'mm-google-shopping', key: 'age_group', type: 'single_line_text_field', value: GOOGLE.age_group},
      {ownerId: v.id, namespace: 'mm-google-shopping', key: 'condition', type: 'single_line_text_field', value: GOOGLE.condition},
      {ownerId: v.id, namespace: 'mm-google-shopping', key: 'gender', type: 'single_line_text_field', value: GOOGLE.gender},
      {ownerId: v.id, namespace: 'mm-google-shopping', key: 'mpn', type: 'single_line_text_field', value: sku},
    );
  }
  return adminGraphql(
    `#graphql
    mutation SetVariantMetas($metafields: [MetafieldsSetInput!]!) {
      metafieldsSet(metafields: $metafields) {
        metafields { id namespace key }
        userErrors { field message }
      }
    }`,
    {metafields: entries},
  );
}

async function main() {
  console.log(`\n→ Target product: ${PRODUCT_GID}`);
  console.log(`→ Shop: ${SHOP}\n`);

  console.log('1) Fetch product + variants');
  const product = await fetchProduct();
  console.log(`  · handle: ${product.handle}`);

  const variants = product.variants.nodes;

  console.log('\n2) Update inventory items: country + HS + weight');
  for (const v of variants) {
    const acc = v.selectedOptions.find((o) => o.name === 'Accessory size')?.value;
    if (!acc) continue;

    let grams;
    if (acc === THREE_YARD_LABEL) {
      grams = THREE_YARD_WEIGHT_GRAMS;
    } else {
      grams = weightGramsForSizeLabel(acc);
      if (grams == null) throw new Error(`No weight mapping for size label: ${acc}`);
    }

    const r = await updateInventoryItem({
      id: v.inventoryItem.id,
      country: COUNTRY,
      hs: HS,
      weightGrams: grams,
    });
    const errs = r.data?.inventoryItemUpdate?.userErrors ?? [];
    if (errs.length) throw new Error(`${acc}: ${errs[0].message}`);
    const updated = r.data?.inventoryItemUpdate?.inventoryItem;
    console.log(
      `  ✓ ${acc.padEnd(28)} sku=${(v.sku ?? '-').padEnd(18)} weight=${updated.measurement.weight.value}${updated.measurement.weight.unit} country=${updated.countryCodeOfOrigin} hs=${updated.harmonizedSystemCode}`,
    );
    await sleep(250);
  }

  console.log('\n3) Set Google metafields on each variant');
  const refreshed = await fetchProduct();
  const r = await setVariantGoogleMetafields(refreshed.variants.nodes);
  const errs = r.data?.metafieldsSet?.userErrors ?? [];
  if (errs.length) throw new Error(errs[0].message);
  console.log(`  ✓ wrote ${r.data?.metafieldsSet?.metafields?.length ?? 0} metafields across ${refreshed.variants.nodes.length} variants`);

  console.log('\n4) Verify final product state');
  const verify = await adminGraphql(
    `#graphql
    query VerifyAll($id: ID!) {
      product(id: $id) {
        handle
        variants(first: 50) {
          nodes {
            title sku barcode price compareAtPrice
            selectedOptions { name value }
            inventoryItem {
              tracked
              countryCodeOfOrigin harmonizedSystemCode
              unitCost { amount currencyCode }
              measurement { weight { value unit } }
            }
            metafields(first: 10) {
              nodes { namespace key value }
            }
          }
        }
      }
    }`,
    {id: PRODUCT_GID},
  );
  const p = verify.data.product;
  console.log(`  handle: ${p.handle}`);
  for (const v of p.variants.nodes) {
    const acc = v.selectedOptions.find((o) => o.name === 'Accessory size')?.value ?? '';
    const inv = v.inventoryItem;
    console.log(
      `  · ${acc.padEnd(28)} sku=${(v.sku ?? '-').padEnd(20)} price=$${(v.price ?? '-').padEnd(8)} compare=${(v.compareAtPrice ?? '-').padEnd(8)} cost=$${(inv.unitCost?.amount ?? '-').padEnd(7)} weight=${(inv.measurement?.weight?.value ?? '-')}${inv.measurement?.weight?.unit ?? ''} country=${inv.countryCodeOfOrigin ?? '-'} hs=${inv.harmonizedSystemCode ?? '-'}`,
    );
    const m = Object.fromEntries(
      (v.metafields.nodes ?? [])
        .filter((n) => n.namespace === 'mm-google-shopping')
        .map((n) => [n.key, n.value]),
    );
    console.log(
      `      google: age_group=${m.age_group ?? '-'} condition=${m.condition ?? '-'} gender=${m.gender ?? '-'} mpn=${m.mpn ?? '-'}`,
    );
  }

  console.log('\n→ Done.\n');
}

main().catch((err) => {
  console.error('FAILED:', err.message ?? err);
  process.exit(1);
});
