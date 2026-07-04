/** List product handles from Storefront vs static catalog */
import {existsSync, readFileSync} from 'node:fs';
import {dirname, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {products as staticProducts} from '../app/models/static/repository.ts';
import {ALL_PRODUCTS_QUERY} from '../app/models/shopify/queries.ts';
import {mapProduct} from '../app/models/shopify/mappers.ts';

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

async function storefrontProducts() {
  const domain = process.env.PUBLIC_STORE_DOMAIN ?? '';
  const token =
    process.env.PRIVATE_STOREFRONT_API_TOKEN ??
    process.env.PUBLIC_STOREFRONT_API_TOKEN ??
    '';
  const storefrontId = process.env.PUBLIC_STOREFRONT_ID ?? '';

  const res = await fetch(`https://${domain}/api/2025-01/graphql.json`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Shopify-Storefront-Access-Token': token,
      ...(storefrontId
        ? {
            'Shopify-Storefront-Private-Token': token,
            'Shopify-Storefront-Id': storefrontId,
          }
        : {}),
    },
    body: JSON.stringify({
      query: ALL_PRODUCTS_QUERY,
      variables: {first: 250},
    }),
  });

  const json = (await res.json()) as {
    data?: {products: {edges: Array<{node: unknown}>}};
    errors?: Array<{message: string}>;
  };

  if (json.errors?.length) {
    throw new Error(json.errors.map((e) => e.message).join('; '));
  }

  return json.data!.products.edges.map(({node}) =>
    mapProduct(node as Parameters<typeof mapProduct>[0]),
  );
}

async function main() {
  const useStatic = process.env.USE_STATIC_CATALOG === 'true';
  console.log(`USE_STATIC_CATALOG=${useStatic}\n`);

  let shopify: Awaited<ReturnType<typeof storefrontProducts>> = [];
  try {
    shopify = await storefrontProducts();
  } catch (err) {
    console.log('Storefront fetch failed:', (err as Error).message);
  }

  console.log(`Static catalog: ${staticProducts.length} products`);
  console.log(`Storefront API:  ${shopify.length} products\n`);

  console.log('--- Static handles ---');
  staticProducts.forEach((p) => console.log(`  ${p.handle}`));

  console.log('\n--- Storefront handles ---');
  shopify.forEach((p) => console.log(`  ${p.handle} (${p.name})`));

  const staticHandles = new Set(staticProducts.map((p) => p.handle));
  const shopifyHandles = new Set(shopify.map((p) => p.handle));
  const overlap = [...staticHandles].filter((h) => shopifyHandles.has(h));

  console.log(`\nOverlap (same handle in both): ${overlap.length}`);
  if (overlap.length) overlap.forEach((h) => console.log(`  ${h}`));

  const activeSource = useStatic ? 'STATIC (+ dummy if enabled)' : 'SHOPIFY (static only if fetch fails)';
  console.log(`\nSite should render: ${activeSource}`);
}

main();
