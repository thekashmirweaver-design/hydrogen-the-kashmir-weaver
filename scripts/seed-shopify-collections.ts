/**
 * Seeds Shopify Admin collections only (from static catalog).
 *
 * Requires (from .env):
 *   PUBLIC_STORE_DOMAIN, SHOPIFY_ADMIN_ACCESS_TOKEN, PUBLIC_STORE_URL
 *
 * Run: npm run seed:collections
 */
import {existsSync, readFileSync} from 'node:fs';
import {dirname, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {collections} from '../app/models/static/repository.ts';

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
    if (!process.env[key]) process.env[key] = value;
  }
}

loadEnvFile();

const SHOP =
  process.env.PUBLIC_STORE_DOMAIN ??
  process.env.SHOPIFY_STORE_DOMAIN ??
  '';
const TOKEN = process.env.SHOPIFY_ADMIN_ACCESS_TOKEN ?? '';
const BASE_URL = (process.env.PUBLIC_STORE_URL ?? '').replace(/\/$/, '');
const API_VERSION = '2025-01';
const HEADLESS_CHANNEL_NAME = 'The Kashmir Weaver';

if (!SHOP || !TOKEN || !BASE_URL) {
  console.error(
    'Missing env: PUBLIC_STORE_DOMAIN, SHOPIFY_ADMIN_ACCESS_TOKEN, PUBLIC_STORE_URL',
  );
  process.exit(1);
}

if (!TOKEN.startsWith('shpat_')) {
  console.error('SHOPIFY_ADMIN_ACCESS_TOKEN must be an Admin API token (shpat_…)');
  process.exit(1);
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const assetUrl = (path: string) => `${BASE_URL}${path.startsWith('/') ? path : `/${path}`}`;

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

async function findCollectionByHandle(handle: string): Promise<string | null> {
  try {
    const data = await adminGraphql<{
      collectionByHandle: {id: string} | null;
    }>(
      `query CollectionByHandle($handle: String!) {
        collectionByHandle(handle: $handle) { id }
      }`,
      {handle},
    );
    return data.collectionByHandle?.id ?? null;
  } catch {
    return null;
  }
}

async function seedCollections(): Promise<Map<string, string>> {
  const handleToId = new Map<string, string>();

  for (const col of collections) {
    try {
      const existingId = await findCollectionByHandle(col.handle);
      if (existingId) {
        handleToId.set(col.handle, existingId);
        console.log(`  · collection ${col.handle} (already exists)`);
        continue;
      }

      const result = await adminGraphql<{
        collectionCreate: {
          collection: {id: string; handle: string};
          userErrors: Array<{message: string}>;
        };
      }>(
        `#graphql
        mutation CreateCollection($input: CollectionInput!) {
          collectionCreate(input: $input) {
            collection { id handle }
            userErrors { message }
          }
        }`,
        {
          input: {
            title: col.name,
            handle: col.handle,
            descriptionHtml: `<p>${col.story}</p>`,
            image: {src: assetUrl(col.hero.src), altText: col.hero.alt},
            metafields: [
              {
                namespace: 'custom',
                key: 'tagline',
                type: 'single_line_text_field',
                value: col.tagline,
              },
              {
                namespace: 'custom',
                key: 'story',
                type: 'multi_line_text_field',
                value: col.story,
              },
            ],
          },
        },
      );

      if (result.collectionCreate.userErrors.length) {
        throw new Error(result.collectionCreate.userErrors[0].message);
      }

      handleToId.set(col.handle, result.collectionCreate.collection.id);
      console.log(`  ✓ collection ${col.handle}`);
    } catch (err) {
      console.log(`  · collection ${col.handle}: ${(err as Error).message}`);
    }
    await sleep(400);
  }

  return handleToId;
}

async function resolvePublicationIds(): Promise<{
  onlineStore: string;
  headless: string;
}> {
  const data = await adminGraphql<{
    catalogs: {nodes: Array<{id: string; title: string}>};
  }>(`query { catalogs(first: 20) { nodes { id title } } }`);

  const online = data.catalogs.nodes.find((c) =>
    c.title.includes('Online Store'),
  );
  const headless = data.catalogs.nodes.find((c) =>
    c.title.includes(HEADLESS_CHANNEL_NAME),
  );

  if (!online || !headless) {
    throw new Error('Could not resolve Online Store and headless catalog IDs');
  }

  return {
    onlineStore: `gid://shopify/Publication/${online.id.split('/').pop()}`,
    headless: `gid://shopify/Publication/${headless.id.split('/').pop()}`,
  };
}

async function publishCollections(
  collectionIds: Map<string, string>,
  publicationIds: string[],
) {
  let published = 0;

  for (const [handle, id] of collectionIds) {
    for (const publicationId of publicationIds) {
      try {
        const result = await adminGraphql<{
          publishablePublish: {userErrors: Array<{message: string}>};
        }>(
          `#graphql
          mutation PublishCollection($id: ID!, $input: [PublicationInput!]!) {
            publishablePublish(id: $id, input: $input) {
              userErrors { message }
            }
          }`,
          {id, input: [{publicationId}]},
        );

        const err = result.publishablePublish.userErrors[0];
        if (err) {
          console.log(`  · publish ${handle}: ${err.message}`);
        } else {
          published++;
        }
      } catch (err) {
        console.log(`  · publish ${handle}: ${(err as Error).message}`);
      }
      await sleep(150);
    }
  }

  return published;
}

async function main() {
  console.log('1. Collections');
  const collectionIds = await seedCollections();

  if (!collectionIds.size) {
    console.log('\nNo collections created or found.');
    process.exit(1);
  }

  console.log('\n2. Publish to Online Store + headless channel');
  try {
    const pubs = await resolvePublicationIds();
    const count = await publishCollections(collectionIds, [
      pubs.onlineStore,
      pubs.headless,
    ]);
    console.log(`  ✓ publication requests completed (${count} ok)`);
  } catch (err) {
    console.log(`  · publish skipped: ${(err as Error).message}`);
    console.log(
      '    Run `npm run auth:deploy-scopes` then `npm run auth:store` (needs write_publications), update SHOPIFY_ADMIN_ACCESS_TOKEN in .env, then npm run seed:collections again.',
    );
  }

  console.log('\nDone.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
