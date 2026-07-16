/**
 * Creates header-menu / footer-menu navigation and basic shop policies.
 *
 * Requires (from .env):
 *   PUBLIC_STORE_DOMAIN or SHOPIFY_STORE_DOMAIN
 *   SHOPIFY_ADMIN_ACCESS_TOKEN  (needs write_online_store_navigation, write_legal_policies)
 *
 * Run: npm run seed:menus
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

type MenuItemInput = {title: string; type: 'HTTP'; url: string};

const HEADER_ITEMS: MenuItemInput[] = [
  {title: 'Shop', type: 'HTTP', url: '/collections/all'},
  {title: 'Collections', type: 'HTTP', url: '/collections'},
  {title: 'Heritage', type: 'HTTP', url: '/heritage'},
  {title: 'Concierge', type: 'HTTP', url: '/concierge'},
];

const FOOTER_OUR_WORLD: MenuItemInput[] = [
  {title: 'Heritage', type: 'HTTP', url: '/heritage'},
  {title: 'Craft', type: 'HTTP', url: '/craft'},
  {title: 'Journal', type: 'HTTP', url: '/journal'},
];

const FOOTER_ITEMS: MenuItemInput[] = [
  {title: 'Shop', type: 'HTTP', url: '/collections/all'},
  {title: 'Collections', type: 'HTTP', url: '/collections'},
  ...FOOTER_OUR_WORLD,
  {title: 'FAQ', type: 'HTTP', url: '/faq'},
  {title: 'Care Guide', type: 'HTTP', url: '/care-guide'},
  {title: 'Terms', type: 'HTTP', url: '/terms'},
  {title: 'Privacy', type: 'HTTP', url: '/privacy'},
  {title: 'Shipping', type: 'HTTP', url: '/shipping'},
  {title: 'Returns', type: 'HTTP', url: '/returns'},
  {title: 'Cancellation', type: 'HTTP', url: '/cancellation'},
  {title: 'Disclaimer', type: 'HTTP', url: '/disclaimer'},
];

const POLICIES: Array<{type: string; body: string}> = [
  {
    type: 'SHIPPING_POLICY',
    body: '<p>The Kashmir Weaver ships worldwide via insured courier. Orders are processed within 2–4 business days. Domestic delivery typically takes 5–10 business days; international delivery 10–21 business days depending on destination and customs. You will receive tracking details by email once your order ships. Shipping fees and any applicable duties are calculated at checkout.</p>',
  },
  {
    type: 'REFUND_POLICY',
    body: '<p>Each piece is handcrafted and inspected before dispatch. If your item arrives damaged or materially different from its description, contact us within 14 days of delivery at thekashmirweaver@gmail.com with your order number and photos. Approved returns are refunded to the original payment method within 10 business days of receiving the returned item. Custom or made-to-order pieces may not be eligible for return unless defective.</p>',
  },
  {
    type: 'TERMS_OF_SERVICE',
    body: '<p>By using The Kashmir Weaver website and purchasing our products, you agree to these terms. All content, imagery, and designs are the property of The Kashmir Weaver. Prices are listed in the currency shown at checkout and may change without notice. We reserve the right to limit quantities or refuse orders. These terms are governed by applicable law in India. For questions, contact thekashmirweaver@gmail.com.</p>',
  },
];

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

async function getMenuId(handle: string): Promise<string | null> {
  const data = await adminGraphql<{
    menus: {nodes: Array<{id: string; handle: string}>};
  }>(`query { menus(first: 50) { nodes { id handle } } }`);
  return data.menus.nodes.find((menu) => menu.handle === handle)?.id ?? null;
}

async function ensureMenu(
  handle: string,
  title: string,
  items: MenuItemInput[],
  options: {replace?: boolean} = {},
): Promise<'created' | 'updated' | 'skipped'> {
  const existingId = await getMenuId(handle);

  if (!existingId) {
    const data = await adminGraphql<{
      menuCreate: {
        menu?: {handle: string};
        userErrors: Array<{field?: string[]; message: string}>;
      };
    }>(
      `mutation ($handle: String!, $title: String!, $items: [MenuItemCreateInput!]!) {
        menuCreate(handle: $handle, title: $title, items: $items) {
          menu { handle }
          userErrors { field message }
        }
      }`,
      {handle, title, items},
    );

    const errors = data.menuCreate.userErrors;
    if (errors.length) {
      throw new Error(
        `menuCreate ${handle}: ${errors.map((e) => e.message).join('; ')}`,
      );
    }

    console.log(`  ${handle}: created`);
    return 'created';
  }

  if (!options.replace) {
    console.log(`  ${handle}: already exists — skipped`);
    return 'skipped';
  }

  // Replace by delete + create so item list matches exactly.
  const deleted = await adminGraphql<{
    menuDelete: {
      deletedMenuId?: string;
      userErrors: Array<{field?: string[]; message: string}>;
    };
  }>(
    `mutation ($id: ID!) {
      menuDelete(id: $id) {
        deletedMenuId
        userErrors { field message }
      }
    }`,
    {id: existingId},
  );

  if (deleted.menuDelete.userErrors.length) {
    throw new Error(
      `menuDelete ${handle}: ${deleted.menuDelete.userErrors
        .map((e) => e.message)
        .join('; ')}`,
    );
  }

  const data = await adminGraphql<{
    menuCreate: {
      menu?: {handle: string};
      userErrors: Array<{field?: string[]; message: string}>;
    };
  }>(
    `mutation ($handle: String!, $title: String!, $items: [MenuItemCreateInput!]!) {
      menuCreate(handle: $handle, title: $title, items: $items) {
        menu { handle }
        userErrors { field message }
      }
    }`,
    {handle, title, items},
  );

  const errors = data.menuCreate.userErrors;
  if (errors.length) {
    throw new Error(
      `menuCreate ${handle}: ${errors.map((e) => e.message).join('; ')}`,
    );
  }

  console.log(`  ${handle}: replaced`);
  return 'updated';
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

async function main() {
  const replaceMenus = process.argv.includes('--replace-menus');

  console.log('1. Navigation menus');
  await ensureMenu('header-menu', 'Header menu', HEADER_ITEMS, {
    replace: replaceMenus,
  });
  await ensureMenu('footer-menu', 'Footer menu', FOOTER_ITEMS, {
    replace: replaceMenus,
  });

  if (!replaceMenus) {
    console.log(
      '  Tip: pass --replace-menus to recreate header/footer from script defaults.',
    );
  }

  console.log('\n2. Shop policies');
  for (const policy of POLICIES) {
    await updatePolicy(policy.type, policy.body);
  }
  console.log(
    '  PRIVACY_POLICY: skipped if Admin auto-manages privacy (disable in Settings → Policies to customize)',
  );

  console.log('\nDone.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
