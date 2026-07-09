/**
 * One-off test: update cost prices on 3 existing variants + add new "3 Yard" variant
 * on product gid://shopify/Product/9324351652055.
 *
 * Run: npx tsx scripts/test-product-update-cost-and-add-variant.ts
 */
import {existsSync, readFileSync} from 'node:fs';
import {dirname, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

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

const USD_TO_INR = 83;

const inrToUsd = (inr) => Math.round((inr / USD_TO_INR) * 100) / 100;

const STOLE_COST_USD = inrToUsd(3500);
const SHAWL_COST_USD = inrToUsd(6800);
const SQUARE_COST_USD = inrToUsd(7500);

const NEW_VARIANT = {
  label: '3 Yard',
  dimensionCm: '137 × 274 cm',
  costUsd: inrToUsd(16500),
  priceUsd: inrToUsd(45000),
  compareAtPriceUsd: inrToUsd(67500),
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

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
  if (json.errors) throw new Error(JSON.stringify(json.errors));
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
            id title sku price compareAtPrice
            selectedOptions { name value }
            inventoryItem { id unitCost { amount currencyCode } }
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
    v.selectedOptions.some(
      (o) => o.name === optionName && o.value === value,
    ),
  );
}

async function setInventoryItemCost(inventoryItemId, costUsd) {
  return adminGraphql(
    `#graphql
    mutation UpdateCost($id: ID!, $input: InventoryItemInput!) {
      inventoryItemUpdate(id: $id, input: $input) {
        inventoryItem { id unitCost { amount currencyCode } }
        userErrors { field message }
      }
    }`,
    {
      id: inventoryItemId,
      input: {cost: costUsd.toFixed(2)},
    },
  );
}

async function addNewVariant(productId, allOptions, existingOptionValues, newOptionName, newOptionValue, costUsd, priceUsd, compareAtPriceUsd) {
  const optionValues = allOptions.map((opt) => {
    if (opt.name === newOptionName) return {optionName: opt.name, name: newOptionValue};
    const existing = existingOptionValues[opt.name];
    if (!existing) throw new Error(`No existing value for option ${opt.name}`);
    return {optionName: opt.name, name: existing};
  });
  return adminGraphql(
    `#graphql
    mutation AddVariant($productId: ID!, $variants: [ProductVariantsBulkInput!]!) {
      productVariantsBulkCreate(productId: $productId, variants: $variants) {
        productVariants {
          id title sku price compareAtPrice
          selectedOptions { name value }
          inventoryItem { id unitCost { amount currencyCode } }
        }
        userErrors { field message }
      }
    }`,
    {
      productId,
      variants: [
        {
          optionValues,
          price: priceUsd.toFixed(2),
          compareAtPrice: compareAtPriceUsd.toFixed(2),
          inventoryItem: {cost: costUsd.toFixed(2)},
        },
      ],
    },
  );
}

async function main() {
  console.log(`\n→ Target product: ${PRODUCT_GID}`);
  console.log('→ Shop:', SHOP);

  const product = await fetchProduct();
  console.log(`→ Handle: ${product.handle}`);

  const variantBySize = {
    Stole: findVariantByOptionValue(
      product.variants.nodes,
      'Accessory size',
      'Stole (70 X 200cm)',
    ),
    Shawl: findVariantByOptionValue(
      product.variants.nodes,
      'Accessory size',
      'Shawl (100×200cm)',
    ),
    Square: findVariantByOptionValue(
      product.variants.nodes,
      'Accessory size',
      'Square Scarf (137×137cm)',
    ),
  };

  for (const [size, variant] of Object.entries(variantBySize)) {
    if (!variant) {
      throw new Error(`Missing variant for ${size}`);
    }
  }

  console.log('\n→ Existing variants:');
  for (const [size, v] of Object.entries(variantBySize)) {
    console.log(`  · ${size} → ${v.id} (sku ${v.sku})`);
  }

  console.log('\n→ Setting cost prices…');
  const costMap = [
    ['Stole', STOLE_COST_USD],
    ['Shawl', SHAWL_COST_USD],
    ['Square', SQUARE_COST_USD],
  ];
  for (const [size, costUsd] of costMap) {
    const variant = variantBySize[size];
    const result = await setInventoryItemCost(variant.inventoryItem.id, costUsd);
    const errs = result.data?.inventoryItemUpdate?.userErrors ?? [];
    if (errs.length) throw new Error(`${size}: ${errs[0].message}`);
    const updated = result.data?.inventoryItemUpdate?.inventoryItem?.unitCost;
    console.log(`  ✓ ${size} cost = $${costUsd.toFixed(2)} (inventory ${updated?.amount} ${updated?.currencyCode})`);
    await sleep(300);
  }

  const existingOption = product.options.find((o) => o.name === 'Accessory size');
  if (!existingOption) {
    throw new Error('No "Accessory size" option on product');
  }
  const newOptionValue = `${NEW_VARIANT.label} (${NEW_VARIANT.dimensionCm})`;

  if (existingOption.values.includes(newOptionValue)) {
    console.log(`\n· ${newOptionValue} already exists — skipping add`);
  } else {
    console.log('\n→ Adding new variant…');
    const existingOptionValuesByName = {};
    for (const v of product.variants.nodes) {
      for (const opt of v.selectedOptions) {
        if (existingOptionValuesByName[opt.name]) continue;
        existingOptionValuesByName[opt.name] = opt.value;
      }
    }

    const addResult = await addNewVariant(
      PRODUCT_GID,
      product.options,
      existingOptionValuesByName,
      'Accessory size',
      newOptionValue,
      NEW_VARIANT.costUsd,
      NEW_VARIANT.priceUsd,
      NEW_VARIANT.compareAtPriceUsd,
    );
    const errs = addResult.data?.productVariantsBulkCreate?.userErrors ?? [];
    if (errs.length) throw new Error(errs[0].message);
    const created = addResult.data?.productVariantsBulkCreate?.productVariants?.[0];
    if (!created) throw new Error('No variant returned from bulkCreate');
    console.log(`  ✓ new variant ${created.id}`);
    console.log(`    title:       ${created.title}`);
    console.log(`    price:       $${created.price} ${created.compareAtPrice ? `(was $${created.compareAtPrice})` : ''}`);
    console.log(`    unit cost:   $${created.inventoryItem?.unitCost?.amount} ${created.inventoryItem?.unitCost?.currencyCode}`);
  }

  console.log('\n→ Done.\n');
}

main().catch((err) => {
  console.error('FAILED:', err.message ?? err);
  process.exit(1);
});
