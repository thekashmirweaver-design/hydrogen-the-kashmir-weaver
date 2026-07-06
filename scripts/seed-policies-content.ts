/**
 * Pushes rewritten policy HTML and disclaimer/faq pages to Shopify.
 *
 * Requires (from .env):
 *   PUBLIC_STORE_DOMAIN or SHOPIFY_STORE_DOMAIN
 *   SHOPIFY_ADMIN_ACCESS_TOKEN  (write_legal_policies, write_content)
 *
 * Run: npm run seed:policies
 *
 * Privacy Policy is intentionally skipped (Shopify auto-managed).
 */
import {existsSync, readFileSync} from 'node:fs';
import {dirname, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {PAGE_UPDATES, POLICY_UPDATES} from './policy-content/index.js';

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

    if (process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}

loadEnvFile();

const SHOP =
  process.env.PUBLIC_STORE_DOMAIN ??
  process.env.SHOPIFY_STORE_DOMAIN ??
  '';
const TOKEN = process.env.SHOPIFY_ADMIN_ACCESS_TOKEN ?? '';
const API_VERSION = '2025-01';

if (!SHOP || !TOKEN) {
  console.error(
    'Missing env: PUBLIC_STORE_DOMAIN, SHOPIFY_ADMIN_ACCESS_TOKEN',
  );
  process.exit(1);
}

if (!TOKEN.startsWith('shpat_')) {
  console.error('SHOPIFY_ADMIN_ACCESS_TOKEN must be an Admin API token (shpat_…)');
  process.exit(1);
}

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

  const json = (await res.json()) as {
    data?: T;
    errors?: Array<{message: string}>;
  };

  if (json.errors?.length) {
    throw new Error(json.errors.map((e) => e.message).join('; '));
  }

  return json.data as T;
}

async function updatePolicy(type: string, body: string): Promise<void> {
  const data = await adminGraphql<{
    shopPolicyUpdate: {
      shopPolicy?: {type: string; title: string};
      userErrors: Array<{field?: string[]; message: string}>;
    };
  }>(
    `mutation ($policy: ShopPolicyInput!) {
      shopPolicyUpdate(shopPolicy: $policy) {
        shopPolicy { type title }
        userErrors { field message }
      }
    }`,
    {policy: {type, body}},
  );

  const errors = data.shopPolicyUpdate.userErrors;
  if (errors.length) {
    console.warn(`  ${type}: ${errors.map((e) => e.message).join('; ')}`);
    return;
  }

  const policy = data.shopPolicyUpdate.shopPolicy;
  console.log(`  ${type}: updated (${policy?.title ?? type})`);
}

async function findPageIdByHandle(handle: string): Promise<string | null> {
  const data = await adminGraphql<{
    pages: {nodes: Array<{id: string; handle: string}>};
  }>(
    `query ($query: String!) {
      pages(first: 1, query: $query) {
        nodes { id handle }
      }
    }`,
    {query: `handle:${handle}`},
  );

  return data.pages.nodes[0]?.id ?? null;
}

async function upsertPage(page: (typeof PAGE_UPDATES)[number]): Promise<void> {
  const existingId = await findPageIdByHandle(page.handle);

  if (existingId) {
    const data = await adminGraphql<{
      pageUpdate: {
        page?: {handle: string; title: string};
        userErrors: Array<{message: string}>;
      };
    }>(
      `mutation ($id: ID!, $page: PageUpdateInput!) {
        pageUpdate(id: $id, page: $page) {
          page { handle title }
          userErrors { message }
        }
      }`,
      {
        id: existingId,
        page: {
          title: page.title,
          body: page.body,
          isPublished: true,
        },
      },
    );

    const errors = data.pageUpdate.userErrors;
    if (errors.length) {
      throw new Error(
        `pageUpdate ${page.handle}: ${errors.map((e) => e.message).join('; ')}`,
      );
    }

    console.log(`  page/${page.handle}: updated`);
    return;
  }

  const data = await adminGraphql<{
    pageCreate: {
      page?: {handle: string; title: string};
      userErrors: Array<{message: string}>;
    };
  }>(
    `mutation ($page: PageCreateInput!) {
      pageCreate(page: $page) {
        page { handle title }
        userErrors { message }
      }
    }`,
    {
      page: {
        handle: page.handle,
        title: page.title,
        body: page.body,
        isPublished: true,
      },
    },
  );

  const errors = data.pageCreate.userErrors;
  if (errors.length) {
    throw new Error(
      `pageCreate ${page.handle}: ${errors.map((e) => e.message).join('; ')}`,
    );
  }

  console.log(`  page/${page.handle}: created`);
}

async function main() {
  console.log('1. Written policies (Privacy skipped)');
  for (const policy of POLICY_UPDATES) {
    await updatePolicy(policy.type, policy.body);
  }
  console.log('  PRIVACY_POLICY: skipped (Shopify auto-managed)');

  console.log('\n2. Online store pages');
  for (const page of PAGE_UPDATES) {
    await upsertPage(page);
  }

  console.log('\nDone.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
