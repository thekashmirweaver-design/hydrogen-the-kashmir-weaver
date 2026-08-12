/**
 * Update Shopify product handles to SEO-friendly slugs from catalog JSON.
 * Run: npx tsx scripts/update-whatsapp-batch-handles.ts [--dry-run]
 */
import {existsSync, readFileSync, writeFileSync} from 'node:fs';
import {dirname, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {homedir} from 'node:os';

const API_VERSION = '2025-10';
const STOREFRONT = 'https://thekashmirweaver.shop';

function loadEnvFile() {
  const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
  const envPath = resolve(root, '.env');
  if (!existsSync(envPath)) return;
  for (const line of readFileSync(envPath, 'utf8').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#') || !trimmed.includes('=')) continue;
    const eq = trimmed.indexOf('=');
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

function loadCliStoreToken(shop: string): string | null {
  const cfgPath = resolve(
    homedir(),
    'Library/Preferences/shopify-cli-store-nodejs/config.json',
  );
  if (!existsSync(cfgPath)) return null;
  const data = JSON.parse(readFileSync(cfgPath, 'utf8')) as Record<
    string,
    unknown
  >;
  const find = (obj: unknown): string | null => {
    if (!obj || typeof obj !== 'object') return null;
    if (Array.isArray(obj)) {
      for (const item of obj) {
        const t = find(item);
        if (t) return t;
      }
      return null;
    }
    const rec = obj as Record<string, unknown>;
    if (
      typeof rec.accessToken === 'string' &&
      rec.accessToken.startsWith('shpat_')
    ) {
      return rec.accessToken;
    }
    for (const v of Object.values(rec)) {
      const t = find(v);
      if (t) return t;
    }
    return null;
  };
  for (const [k, v] of Object.entries(data)) {
    if (k.includes(shop.replace('.myshopify.com', '')) || k.includes(shop)) {
      const t = find(v);
      if (t) return t;
    }
  }
  return null;
}

async function adminGraphql<T>(
  shop: string,
  token: string,
  query: string,
  variables?: Record<string, unknown>,
): Promise<T> {
  const res = await fetch(
    `https://${shop}/admin/api/${API_VERSION}/graphql.json`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Access-Token': token,
      },
      body: JSON.stringify({query, variables}),
    },
  );
  const json = (await res.json()) as {
    data?: T;
    errors?: Array<{message: string}>;
  };
  if (json.errors?.length) {
    throw new Error(json.errors.map((e) => e.message).join('; '));
  }
  if (!json.data) throw new Error('GraphQL response missing data');
  return json.data;
}

async function findProductByHandle(
  shop: string,
  token: string,
  handle: string,
): Promise<{id: string} | null> {
  const data = await adminGraphql<{
    productByHandle: {id: string} | null;
  }>(
    shop,
    token,
    `query($handle: String!) { productByHandle(handle: $handle) { id } }`,
    {handle},
  );
  return data.productByHandle;
}

async function updateHandle(
  shop: string,
  token: string,
  productId: string,
  handle: string,
) {
  const data = await adminGraphql<{
    productUpdate: {
      product: {id: string; handle: string} | null;
      userErrors: Array<{message: string}>;
    };
  }>(
    shop,
    token,
    `#graphql
    mutation($input: ProductInput!) {
      productUpdate(input: $input) {
        product { id handle }
        userErrors { field message }
      }
    }`,
    {input: {id: productId, handle}},
  );
  if (data.productUpdate.userErrors.length) {
    throw new Error(
      data.productUpdate.userErrors.map((e) => e.message).join('; '),
    );
  }
  return data.productUpdate.product!;
}

async function main() {
  loadEnvFile();
  const dryRun = process.argv.includes('--dry-run');
  const shop = process.env.PUBLIC_STORE_DOMAIN ?? '70yuey-sr.myshopify.com';
  let token =
    process.env.SHOPIFY_ADMIN_ACCESS_TOKEN ??
    (existsSync('/tmp/shopify_admin_token.txt')
      ? readFileSync('/tmp/shopify_admin_token.txt', 'utf8').trim()
      : '');
  const cliToken = loadCliStoreToken(shop);
  if (cliToken) token = cliToken;
  if (!token) {
    console.error('No Admin API token');
    process.exit(1);
  }

  const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
  const catalog = JSON.parse(
    readFileSync(resolve(root, 'scripts/data/whatsapp-batch-catalog.json'), 'utf8'),
  ) as Array<{index: number; handle: string}>;
  const resultsPath = resolve(root, 'whatsapp-batch-upload-results.json');
  const results = JSON.parse(readFileSync(resultsPath, 'utf8')) as Array<{
    index: number;
    handle: string;
    productId: string;
    status: string;
    adminUrl?: string;
    storefrontUrl?: string;
  }>;

  const handleByIndex = new Map(catalog.map((c) => [c.index, c.handle]));
  console.log(
    `Updating handles${dryRun ? ' (DRY RUN)' : ''} for ${results.length} products\n`,
  );

  const updatedResults = [...results];
  let ok = 0;
  let skipped = 0;
  let failed = 0;

  for (const row of results) {
    if (row.status !== 'created' || !row.productId) continue;
    const newHandle = handleByIndex.get(row.index);
    if (!newHandle) {
      console.log(`  · #${row.index} — no catalog entry, skip`);
      skipped++;
      continue;
    }
    if (row.handle === newHandle) {
      console.log(`  · #${row.index} already ${newHandle}`);
      skipped++;
      continue;
    }

    const conflict = await findProductByHandle(shop, token, newHandle);
    if (conflict && conflict.id !== row.productId) {
      console.error(`  ✗ #${row.index} handle taken: ${newHandle}`);
      failed++;
      continue;
    }

    console.log(`  #${row.index}: ${row.handle} → ${newHandle}`);
    if (dryRun) {
      ok++;
      continue;
    }

    try {
      const updated = await updateHandle(shop, token, row.productId, newHandle);
      const numericId = row.productId.split('/').pop();
      const i = updatedResults.findIndex((r) => r.index === row.index);
      if (i >= 0) {
        updatedResults[i] = {
          ...updatedResults[i],
          handle: updated.handle,
          adminUrl: `https://${shop}/admin/products/${numericId}`,
          storefrontUrl: `${STOREFRONT}/products/${updated.handle}`,
        };
      }
      ok++;
    } catch (err) {
      failed++;
      console.error(
        `  ✗ failed: ${err instanceof Error ? err.message : err}`,
      );
    }
  }

  if (!dryRun) {
    writeFileSync(resultsPath, JSON.stringify(updatedResults, null, 2));
    console.log(`\nResults updated: ${resultsPath}`);
  }
  console.log(`Done. updated=${ok} skipped=${skipped} failed=${failed}`);
  if (failed > 0) process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
