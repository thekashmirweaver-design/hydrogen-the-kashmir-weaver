/**
 * Test on product gid://shopify/Product/9324351520983
 * (handle: red-cashmere-pashmina-shawl-handwoven-in-kashmir-7):
 *   - Create 4 VARIANT-owned Google metafield definitions (mm-google-shopping).
 *   - On the 3 existing variants: set inventoryItem cost (INR→USD),
 *     countryCodeOfOrigin=IN, harmonizedSystemCode=6214.20, weight per
 *     weightGramsForSizeLabel.
 *   - Add new variant "Red / 3 Yard (137 × 274 cm)" SKU TKW-SLD-242-XL,
 *     barcode=SKU, tracked=false, weight 300 g, country IN, HS 6214.20,
 *     cost $198.80, price $542.17, compareAt $813.25.
 *   - Set Google metafields on each of the 4 variants:
 *     age_group=adult, condition=new, gender=unisex, mpn=<own sku>.
 *
 * Run: npx tsx scripts/test-product-2-cost-and-metafields.ts
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
const PRODUCT_GID = 'gid://shopify/Product/9324351520983';

const USD_TO_INR = 83;
const inrToUsd = (inr) => Math.round((inr / USD_TO_INR) * 100) / 100;

const COST_INR = {Stole: 3500, Shawl: 6800, Square: 7500, ThreeYard: 16500};
const COST_USD = {
  Stole: inrToUsd(COST_INR.Stole),
  Shawl: inrToUsd(COST_INR.Shawl),
  Square: inrToUsd(COST_INR.Square),
  ThreeYard: inrToUsd(COST_INR.ThreeYard),
};

const NEW_VARIANT = {
  label: '3 Yard',
  dimensionCm: '137 × 274 cm',
  sku: 'TKW-SLD-242-XL',
  weightGrams: 300,
  country: 'IN',
  hs: '6214.20',
  priceUsd: inrToUsd(45000),
  compareAtUsd: inrToUsd(67500),
  costUsd: COST_USD.ThreeYard,
};

const VARIANT_DEFS = [
  {
    key: 'age_group',
    name: 'Google: Age Group',
    validations: ['adult', 'kids', 'toddler', 'infant', 'newborn'],
  },
  {
    key: 'condition',
    name: 'Google: Condition',
    validations: ['new', 'refurbished', 'used'],
  },
  {
    key: 'gender',
    name: 'Google: Gender',
    validations: ['unisex', 'male', 'female'],
  },
  {key: 'mpn', name: 'Google: MPN', validations: []},
];

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

function findVariantByOptionValue(variants, optionName, value) {
  return variants.find((v) =>
    v.selectedOptions.some((o) => o.name === optionName && o.value === value),
  );
}

async function ensureDefinition(key, name, ownerType, validations) {
  const result = await adminGraphql(
    `#graphql
    mutation CreateDef($def: MetafieldDefinitionInput!) {
      metafieldDefinitionCreate(definition: $def) {
        createdDefinition { id name }
        userErrors { field message code }
      }
    }`,
    {
      def: {
        namespace: 'mm-google-shopping',
        key,
        name,
        type: 'single_line_text_field',
        ownerType,
        validations: validations.map((v) => ({name: 'choices', value: JSON.stringify([v])})),
        access: {storefront: 'PUBLIC_READ'},
      },
    },
  );

  const errs = result.data?.metafieldDefinitionCreate?.userErrors ?? [];
  if (errs.length) {
    const taken = errs.some((e) => e.code === 'TAKEN' || /taken/i.test(e.message));
    if (taken) return {created: false};
    throw new Error(errs.map((e) => e.message).join('; '));
  }
  return {created: true};
}

async function updateInventoryItem({
  id,
  costUsd,
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
        cost: costUsd.toFixed(2),
        countryCodeOfOrigin: country,
        harmonizedSystemCode: hs,
        measurement: {weight: {value: weightGrams, unit: 'GRAMS'}},
      },
    },
  );
}

async function addThreeYardVariant(productId, colorOptionValue) {
  const newSizeValue = `${NEW_VARIANT.label} (${NEW_VARIANT.dimensionCm})`;
  return adminGraphql(
    `#graphql
    mutation AddVariant($productId: ID!, $variants: [ProductVariantsBulkInput!]!) {
      productVariantsBulkCreate(productId: $productId, variants: $variants) {
        productVariants {
          id title sku barcode price compareAtPrice
          selectedOptions { name value }
          inventoryItem {
            id tracked requiresShipping
            unitCost { amount currencyCode }
            countryCodeOfOrigin
            harmonizedSystemCode
            measurement { weight { value unit } }
          }
        }
        userErrors { field message }
      }
    }`,
    {
      productId,
      variants: [
        {
          optionValues: [
            {optionName: 'Color', name: colorOptionValue},
            {optionName: 'Accessory size', name: newSizeValue},
          ],
          price: NEW_VARIANT.priceUsd.toFixed(2),
          compareAtPrice: NEW_VARIANT.compareAtUsd.toFixed(2),
          barcode: NEW_VARIANT.sku,
          inventoryItem: {
            tracked: false,
            requiresShipping: true,
            sku: NEW_VARIANT.sku,
            cost: NEW_VARIANT.costUsd.toFixed(2),
            countryCodeOfOrigin: NEW_VARIANT.country,
            harmonizedSystemCode: NEW_VARIANT.hs,
            measurement: {weight: {value: NEW_VARIANT.weightGrams, unit: 'GRAMS'}},
          },
        },
      ],
    },
  );
}

async function setVariantGoogleMetafields(variants, ageGroup, condition, gender) {
  const entries = [];
  for (const v of variants) {
    const sku = v.sku;
    entries.push(
      {ownerId: v.id, namespace: 'mm-google-shopping', key: 'age_group', type: 'single_line_text_field', value: ageGroup},
      {ownerId: v.id, namespace: 'mm-google-shopping', key: 'condition', type: 'single_line_text_field', value: condition},
      {ownerId: v.id, namespace: 'mm-google-shopping', key: 'gender', type: 'single_line_text_field', value: gender},
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

  console.log('1) Ensure 4 VARIANT metafield definitions');
  for (const def of VARIANT_DEFS) {
    const r = await ensureDefinition(def.key, def.name, 'PRODUCTVARIANT', def.validations);
    console.log(`  ${r.created ? '✓' : '·'} mm-google-shopping.${def.key} (${def.name})`);
    await sleep(250);
  }

  console.log('\n2) Fetch product and existing variants');
  const product = await fetchProduct();
  console.log(`  · handle: ${product.handle}`);

  const existingSizes = {
    Stole: 'Stole (70 X 200cm)',
    Shawl: 'Shawl (100×200cm)',
    Square: 'Square Scarf (137×137cm)',
  };
  const variants = product.variants.nodes;
  const variantBySize = {};
  for (const [size, optionValue] of Object.entries(existingSizes)) {
    variantBySize[size] = findVariantByOptionValue(variants, 'Accessory size', optionValue);
    if (!variantBySize[size]) throw new Error(`Missing existing variant for ${size}`);
  }

  const sizeLabelMatch = (v) => v.selectedOptions.find((o) => o.name === 'Accessory size')?.value;

  console.log('\n3) Update 3 existing inventory items');
  const sizes = ['Stole', 'Shawl', 'Square'];
  for (const size of sizes) {
    const v = variantBySize[size];
    const sizeLabel = sizeLabelMatch(v);
    const grams = weightGramsForSizeLabel(sizeLabel);
    if (grams == null) throw new Error(`No weight mapping for ${sizeLabel}`);
    const r = await updateInventoryItem({
      id: v.inventoryItem.id,
      costUsd: COST_USD[size],
      country: 'IN',
      hs: '6214.20',
      weightGrams: grams,
    });
    const errs = r.data?.inventoryItemUpdate?.userErrors ?? [];
    if (errs.length) throw new Error(`${size}: ${errs[0].message}`);
    const updated = r.data?.inventoryItemUpdate?.inventoryItem;
    console.log(
      `  ✓ ${size.padEnd(6)} sku=${v.sku.padEnd(18)} cost=$${updated.unitCost.amount} ${updated.unitCost.currencyCode} weight=${updated.measurement.weight.value}${updated.measurement.weight.unit} country=${updated.countryCodeOfOrigin} hs=${updated.harmonizedSystemCode}`,
    );
    await sleep(250);
  }

  console.log('\n4) Add new "3 Yard (137 × 274 cm)" variant');
  const colorValue = variants[0].selectedOptions.find((o) => o.name === 'Color')?.value;
  if (!colorValue) throw new Error('No Color option value found');

  const sizeOption = product.options.find((o) => o.name === 'Accessory size');
  const newSizeValue = `${NEW_VARIANT.label} (${NEW_VARIANT.dimensionCm})`;

  let newVariantGid = null;
  if (sizeOption?.values?.includes(newSizeValue)) {
    console.log(`  · ${newSizeValue} already exists — skip create`);
    newVariantGid = findVariantByOptionValue(variants, 'Accessory size', newSizeValue)?.id;
    if (newVariantGid) {
      console.log(`  · existing variant ${newVariantGid}`);
    }
  } else {
    const r = await addThreeYardVariant(PRODUCT_GID, colorValue);
    const errs = r.data?.productVariantsBulkCreate?.userErrors ?? [];
    if (errs.length) throw new Error(errs[0].message);
    const created = r.data?.productVariantsBulkCreate?.productVariants?.[0];
    if (!created) throw new Error('No variant returned from bulkCreate');
    newVariantGid = created.id;
    console.log(`  ✓ created ${created.id}`);
    console.log(
      `    title=${created.title} sku=${created.sku} barcode=${created.barcode} price=$${created.price} compare=$${created.compareAtPrice} cost=$${created.inventoryItem.unitCost.amount} weight=${created.inventoryItem.measurement.weight.value}${created.inventoryItem.measurement.weight.unit}`,
    );
    await sleep(500);
  }

  console.log('\n5) Set Google metafields on each variant');
  const refreshed = await fetchProduct();
  const allVariants = refreshed.variants.nodes;
  const r = await setVariantGoogleMetafields(
    allVariants,
    'adult',
    'new',
    'unisex',
  );
  const setErrs = r.data?.metafieldsSet?.userErrors ?? [];
  if (setErrs.length) throw new Error(setErrs[0].message);
  console.log(`  ✓ wrote ${r.data?.metafieldsSet?.metafields?.length ?? 0} metafields across ${allVariants.length} variants`);

  console.log('\n6) Verify final product state');
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
      `  · ${acc.padEnd(28)} sku=${(v.sku ?? '-').padEnd(20)} barcode=${(v.barcode ?? '-').padEnd(20)} price=$${(v.price ?? '-').padEnd(8)} compare=${(v.compareAtPrice ?? '-').padEnd(8)} cost=$${(inv.unitCost?.amount ?? '-').padEnd(7)} weight=${(inv.measurement?.weight?.value ?? '-')}${inv.measurement?.weight?.unit ?? ''} country=${inv.countryCodeOfOrigin ?? '-'} hs=${inv.harmonizedSystemCode ?? '-'}`,
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
