/**
 * Activate the meta-purchase-pixel web pixel extension on the store.
 *
 * Prefers Partner app client-credentials token (owns the extension).
 * Falls back to SHOPIFY_ADMIN_ACCESS_TOKEN from .env (store auth / custom app).
 *
 * Usage: npx tsx scripts/activate-meta-web-pixel.ts
 */
import {readFileSync, existsSync} from 'node:fs';
import {resolve} from 'node:path';

const ROOT = resolve(import.meta.dirname, '..');
const PIXEL_ID = '1724382275473712';
const API_VERSION = '2025-10';

function loadEnv(): Record<string, string> {
  const env: Record<string, string> = {...process.env} as Record<string, string>;
  const path = resolve(ROOT, '.env');
  if (!existsSync(path)) return env;
  for (const line of readFileSync(path, 'utf8').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#') || !trimmed.includes('=')) continue;
    const i = trimmed.indexOf('=');
    const key = trimmed.slice(0, i).trim();
    let val = trimmed.slice(i + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    if (!(key in env) || env[key] === '') env[key] = val;
  }
  return env;
}

async function gql(
  shop: string,
  token: string,
  query: string,
  variables?: Record<string, unknown>,
) {
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
    data?: any;
    errors?: Array<{message: string}>;
  };
  return json;
}

async function clientCredentialsToken(
  shop: string,
  clientId: string,
  clientSecret: string,
): Promise<string | null> {
  const res = await fetch(`https://${shop}/admin/oauth/access_token`, {
    method: 'POST',
    headers: {'Content-Type': 'application/x-www-form-urlencoded'},
    body: new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: clientId,
      client_secret: clientSecret,
    }),
  });
  const text = await res.text();
  let json: {
    access_token?: string;
    error?: string;
    error_description?: string;
  };
  try {
    json = JSON.parse(text);
  } catch {
    console.warn(
      'Partner client_credentials returned non-JSON (app likely not installed on store).',
      text.slice(0, 120).replace(/\s+/g, ' '),
    );
    return null;
  }
  if (!json.access_token) {
    console.warn(
      'Partner client_credentials failed:',
      json.error || json.error_description || JSON.stringify(json),
    );
    return null;
  }
  return json.access_token;
}

async function activate(shop: string, token: string, label: string) {
  console.log(`\nUsing token from: ${label}`);

  const who = await gql(
    shop,
    token,
    `{ currentAppInstallation { app { title apiKey } accessScopes { handle } } webPixel { id settings } }`,
  );
  if (who.errors?.length) {
    console.warn('Probe errors:', who.errors.map((e) => e.message).join('; '));
  }
  const app = who.data?.currentAppInstallation?.app;
  const scopes = (who.data?.currentAppInstallation?.accessScopes || []).map(
    (s: {handle: string}) => s.handle,
  );
  console.log('App:', app?.title, `(${app?.apiKey})`);
  console.log(
    'Has pixel scopes:',
    scopes.includes('write_pixels') && scopes.includes('read_customer_events'),
  );
  console.log('Existing webPixel:', who.data?.webPixel || null);

  const settings = JSON.stringify({pixelID: PIXEL_ID});

  if (who.data?.webPixel?.id) {
    const updated = await gql(
      shop,
      token,
      `mutation webPixelUpdate($id: ID!, $webPixel: WebPixelInput!) {
        webPixelUpdate(id: $id, webPixel: $webPixel) {
          userErrors { field message code }
          webPixel { id settings }
        }
      }`,
      {id: who.data.webPixel.id, webPixel: {settings}},
    );
    const payload = updated.data?.webPixelUpdate;
    if (payload?.userErrors?.length) {
      console.error('webPixelUpdate errors:', payload.userErrors);
      return false;
    }
    console.log('Updated web pixel:', payload?.webPixel);
    return true;
  }

  const created = await gql(
    shop,
    token,
    `mutation webPixelCreate($webPixel: WebPixelInput!) {
      webPixelCreate(webPixel: $webPixel) {
        userErrors { field message code }
        webPixel { id settings }
      }
    }`,
    {webPixel: {settings}},
  );
  if (created.errors?.length) {
    console.error('GraphQL errors:', created.errors);
    return false;
  }
  const payload = created.data?.webPixelCreate;
  if (payload?.userErrors?.length) {
    console.error('webPixelCreate errors:', payload.userErrors);
    return false;
  }
  console.log('Created web pixel:', payload?.webPixel);
  return true;
}

async function main() {
  const env = loadEnv();
  const shop = env.PUBLIC_STORE_DOMAIN;
  if (!shop) throw new Error('Missing PUBLIC_STORE_DOMAIN');

  const pixelFromEnv = env.PUBLIC_META_PIXEL_ID?.trim();
  if (pixelFromEnv && pixelFromEnv !== PIXEL_ID) {
    console.warn(
      `Note: PUBLIC_META_PIXEL_ID=${pixelFromEnv} differs from hardcoded ${PIXEL_ID}; using settings pixelID=${PIXEL_ID}`,
    );
  }

  const partnerToken =
    env.SHOPIFY_API_KEY && env.SHOPIFY_API_SECRET
      ? await clientCredentialsToken(
          shop,
          env.SHOPIFY_API_KEY,
          env.SHOPIFY_API_SECRET,
        )
      : null;

  if (partnerToken) {
    const ok = await activate(shop, partnerToken, 'Partner client_credentials');
    if (ok) return;
  }

  const adminToken = env.SHOPIFY_ADMIN_ACCESS_TOKEN;
  if (!adminToken) {
    throw new Error(
      'No Partner token and no SHOPIFY_ADMIN_ACCESS_TOKEN — run npm run auth:store && npm run auth:sync-env',
    );
  }

  const ok = await activate(shop, adminToken, 'SHOPIFY_ADMIN_ACCESS_TOKEN');
  if (!ok) {
    process.exitCode = 1;
    console.error(
      '\nActivation failed. Deploy the extension (npm run auth:deploy-scopes), install the Partner app on the store, then re-run npm run pixel:activate.',
    );
  }
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
