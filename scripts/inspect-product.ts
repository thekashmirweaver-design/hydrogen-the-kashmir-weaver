/**
 * Inspect mapped product data from Storefront API (same path as the PDP loader).
 * Usage: tsx scripts/inspect-product.ts [handle]
 */
import {existsSync, readFileSync} from 'node:fs';
import {dirname, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {mapProduct} from '../app/models/shopify/mappers.ts';
import {PRODUCT_BY_HANDLE_QUERY} from '../app/models/shopify/queries.ts';

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
const domain = process.env.PUBLIC_STORE_DOMAIN ?? '';
const token =
  process.env.PRIVATE_STOREFRONT_API_TOKEN ??
  process.env.PUBLIC_STOREFRONT_API_TOKEN ??
  '';
const storefrontId = process.env.PUBLIC_STOREFRONT_ID ?? '';

if (!domain || !token) {
  console.error('Missing PUBLIC_STORE_DOMAIN or storefront token in .env');
  process.exit(1);
}

const QUERY = PRODUCT_BY_HANDLE_QUERY;

async function main() {
  const res = await fetch(
    `https://${domain}/api/2025-01/graphql.json`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Storefront-Access-Token': token,
        ...(storefrontId
          ? {'Shopify-Storefront-Private-Token': token, 'Shopify-Storefront-Id': storefrontId}
          : {}),
      },
      body: JSON.stringify({query: QUERY, variables: {handle}}),
    },
  );

  const json = (await res.json()) as {
    data?: {product: unknown};
    errors?: Array<{message: string}>;
  };

  if (!res.ok) {
    console.error('Storefront HTTP error:', res.status);
    process.exit(1);
  }

  if (json.errors?.length) {
    console.warn(
      'Storefront partial errors (data may still be usable):',
      json.errors.map((e) => e.message).join('; '),
    );
  }

  if (!json.data?.product) {
    console.log(`No product found for handle: ${handle}`);
    process.exit(0);
  }

  const raw = json.data.product;
  const mapped = mapProduct(raw as Parameters<typeof mapProduct>[0]);

  console.log(`\n=== Storefront raw: ${handle} ===\n`);
  console.log(JSON.stringify(raw, null, 2));

  console.log(`\n=== Mapped Product (what PDP receives) ===\n`);
  console.log(JSON.stringify(mapped, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
