/**
 * Copies the Shopify CLI store auth token into local .env as SHOPIFY_ADMIN_ACCESS_TOKEN.
 *
 * Run after: npm run auth:store
 * Requires: ~/Library/Preferences/shopify-cli-store-nodejs/config.json (macOS)
 */
import {existsSync, readFileSync, writeFileSync} from 'node:fs';
import {homedir} from 'node:os';
import {dirname, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

const STORE = '70yuey-sr.myshopify.com';
const ENV_KEY = 'SHOPIFY_ADMIN_ACCESS_TOKEN';

function cliConfigPath() {
  return resolve(
    homedir(),
    'Library/Preferences/shopify-cli-store-nodejs/config.json',
  );
}

function findStoreSession(config: Record<string, unknown>) {
  for (const [key, value] of Object.entries(config)) {
    if (!key.endsWith(`::${STORE}`) || typeof value !== 'object' || !value) {
      continue;
    }
    const storeEntry = value as {
      currentUserId?: string;
      sessionsByUserId?: Record<
        string,
        {accessToken?: string; scopes?: string[]}
      >;
    };
    const userId = storeEntry.currentUserId;
    const session = userId
      ? storeEntry.sessionsByUserId?.[userId]
      : undefined;
    if (session?.accessToken) return session;
  }
  return null;
}

function updateEnvFile(envPath: string, token: string) {
  const line = `${ENV_KEY}=${token}`;
  if (!existsSync(envPath)) {
    writeFileSync(envPath, `${line}\n`, 'utf8');
    return;
  }

  const contents = readFileSync(envPath, 'utf8');
  const pattern = new RegExp(`^${ENV_KEY}=.*$`, 'm');
  if (pattern.test(contents)) {
    writeFileSync(envPath, contents.replace(pattern, line), 'utf8');
    return;
  }
  writeFileSync(
    envPath,
    contents.endsWith('\n') ? `${contents}${line}\n` : `${contents}\n${line}\n`,
    'utf8',
  );
}

function main() {
  const configPath = cliConfigPath();
  if (!existsSync(configPath)) {
    console.error(
      `No CLI store auth found at ${configPath}. Run: npm run auth:store`,
    );
    process.exit(1);
  }

  const session = findStoreSession(
    JSON.parse(readFileSync(configPath, 'utf8')) as Record<string, unknown>,
  );
  if (!session?.accessToken) {
    console.error(`No stored token for ${STORE}. Run: npm run auth:store`);
    process.exit(1);
  }

  const scopes = session.scopes ?? [];
  const hasPublications = scopes.includes('write_publications');
  const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
  updateEnvFile(resolve(root, '.env'), session.accessToken);

  console.log(`Updated .env ${ENV_KEY} from CLI store auth (${STORE}).`);
  console.log(`Scopes: ${scopes.join(', ') || '(unknown)'}`);
  if (!hasPublications) {
    console.warn(
      'Missing write_publications — run npm run auth:store again after npm run auth:deploy-scopes.',
    );
    process.exit(1);
  }
}

main();
