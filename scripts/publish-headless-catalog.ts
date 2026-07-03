/**
 * Publishes all products and custom collections to the Hydrogen headless channel
 * ("The Kashmir Weaver") so the Storefront API returns them.
 *
 * Requires SHOPIFY_ADMIN_ACCESS_TOKEN with write_publications (re-run shopify store auth
 * after shopify.app.toml scope update).
 *
 * Run: npm run publish:headless
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
    ) {
      value = value.slice(1, -1);
    }
    if (process.env[key] === undefined) process.env[key] = value;
  }
}

loadEnvFile();

const SHOP =
  process.env.PUBLIC_STORE_DOMAIN ??
  process.env.SHOPIFY_STORE_DOMAIN ??
  '';
const TOKEN = process.env.SHOPIFY_ADMIN_ACCESS_TOKEN ?? '';
const API_VERSION = '2025-01';
const HEADLESS_CHANNEL_NAME = 'The Kashmir Weaver';

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function adminGraphql<T>(
  query: string,
  variables?: Record<string, unknown>,
): Promise<T> {
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

  if (!res.ok) {
    throw new Error(`Admin API ${res.status}: ${await res.text()}`);
  }

  const json = (await res.json()) as {data?: T; errors?: Array<{message: string}>};
  if (json.errors?.length) {
    throw new Error(json.errors.map((e) => e.message).join('; '));
  }
  return json.data as T;
}

async function resolveHeadlessPublicationId(): Promise<string> {
  const data = await adminGraphql<{
    catalogs: {nodes: Array<{id: string; title: string}>};
  }>(`#graphql
    query HeadlessCatalogs {
      catalogs(first: 20) {
        nodes {
          id
          title
        }
      }
    }`);

  const match = data.catalogs.nodes.find((c) =>
    c.title.includes(HEADLESS_CHANNEL_NAME),
  );
  if (!match) {
    throw new Error(
      `No AppCatalog found for "${HEADLESS_CHANNEL_NAME}". Check Sales channels in Admin.`,
    );
  }

  // Publication GID shares the AppCatalog numeric suffix on Shopify
  const numeric = match.id.split('/').pop();
  return `gid://shopify/Publication/${numeric}`;
}

async function publishAll(publicationId: string) {
  let cursor: string | null = null;
  let published = 0;

  for (;;) {
    const data = await adminGraphql<{
      products: {
        nodes: Array<{id: string; handle: string}>;
        pageInfo: {hasNextPage: boolean; endCursor: string | null};
      };
    }>(
      `#graphql
      query ProductsToPublish($cursor: String) {
        products(first: 50, after: $cursor) {
          nodes { id handle }
          pageInfo { hasNextPage endCursor }
        }
      }`,
      {cursor},
    );

    for (const product of data.products.nodes) {
      const result = await adminGraphql<{
        publishablePublish: {userErrors: Array<{message: string}>};
      }>(
        `#graphql
        mutation PublishProduct($id: ID!, $input: [PublicationInput!]!) {
          publishablePublish(id: $id, input: $input) {
            userErrors { message }
          }
        }`,
        {id: product.id, input: [{publicationId}]},
      );

      const err = result.publishablePublish.userErrors[0];
      if (err) {
        console.log(`  · ${product.handle}: ${err.message}`);
      } else {
        published++;
        console.log(`  ✓ ${product.handle}`);
      }
      await sleep(150);
    }

    if (!data.products.pageInfo.hasNextPage) break;
    cursor = data.products.pageInfo.endCursor;
  }

  console.log(`\nPublished ${published} products to headless channel.`);
}

async function main() {
  if (!SHOP || !TOKEN) {
    console.error('Missing PUBLIC_STORE_DOMAIN and SHOPIFY_ADMIN_ACCESS_TOKEN in .env');
    process.exit(1);
  }

  console.log(`Resolving publication for "${HEADLESS_CHANNEL_NAME}"…`);
  const publicationId = await resolveHeadlessPublicationId();
  console.log(`Publication: ${publicationId}\n`);

  await publishAll(publicationId);
}

main().catch((err) => {
  console.error(err);
  console.error(
      '\nIf you see write_publications denied, run: npm run auth:deploy-scopes && npm run auth:store\n' +
      'Then npm run auth:sync-env and re-run npm run publish:headless',
  );
  process.exit(1);
});
