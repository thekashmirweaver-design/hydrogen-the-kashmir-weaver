/** Admin API product snapshot for debugging */
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
    ) {
      value = value.slice(1, -1);
    }
    if (process.env[key] === undefined) process.env[key] = value;
  }
}

loadEnvFile();

const handle = process.argv[2] ?? 'blush-rose-pashmina';
const SHOP = process.env.PUBLIC_STORE_DOMAIN ?? '';
const TOKEN = process.env.SHOPIFY_ADMIN_ACCESS_TOKEN ?? '';

async function adminGraphql(query: string, variables?: Record<string, unknown>) {
  const res = await fetch(`https://${SHOP}/admin/api/2025-01/graphql.json`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Shopify-Access-Token': TOKEN,
    },
    body: JSON.stringify({query, variables}),
  });
  return res.json();
}

async function main() {
  if (process.argv.includes('--list')) {
    const {data} = (await adminGraphql(
      `query { products(first: 20) { nodes { handle title options { name values } variants(first: 5) { nodes { title selectedOptions { name value } price availableForSale } } } } }`,
    )) as {data?: unknown};
    console.log(JSON.stringify(data, null, 2));
    return;
  }

  const {data, errors} = (await adminGraphql(
    `#graphql
    query($handle: String!) {
      productByHandle(handle: $handle) {
        id
        handle
        title
        status
        descriptionHtml
        productType
        vendor
        tags
        createdAt
        updatedAt
        publishedAt
        totalInventory
        tracksInventory
        options { name values }
        featuredImage { url altText width height }
        images(first: 15) { nodes { url altText width height } }
        collections(first: 10) { nodes { handle title } }
        metafields(first: 20, namespace: "custom") {
          nodes { key namespace value type }
        }
        variants(first: 10) {
          nodes {
            id
            title
            sku
            barcode
            availableForSale
            displayName
            selectedOptions { name value }
            price
            compareAtPrice
            inventoryQuantity
            inventoryPolicy
            inventoryItem {
              id
              tracked
              requiresShipping
              measurement {
                weight { value unit }
              }
            }
          }
        }
        resourcePublications(first: 10) {
          nodes { publication { name } isPublished publishDate }
        }
      }
    }`,
    {handle},
  )) as {data?: unknown; errors?: unknown};

  if (errors) {
    console.error('Admin API errors:', JSON.stringify(errors, null, 2));
  }
  console.log(JSON.stringify(data, null, 2));
}

main();
