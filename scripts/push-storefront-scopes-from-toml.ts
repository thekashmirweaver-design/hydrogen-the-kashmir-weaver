/**
 * Reads shopify.storefront.toml and applies Storefront API permissions guidance.
 *
 * Hydrogen storefront tokens inherit scopes from the Hydrogen sales channel
 * (Admin → Hydrogen → Storefront settings → Storefront API). There is no
 * hydrogen storefront-api-push CLI yet; this script validates config and
 * deploys Partner app scopes from shopify.app.toml when requested.
 *
 * Run: npm run storefront:push-scopes
 */
import {existsSync, readFileSync} from 'node:fs';
import {dirname, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {execSync} from 'node:child_process';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const tomlPath = resolve(root, 'shopify.storefront.toml');

function parseStorefrontToml(content: string) {
  const storefrontId =
    content.match(/^storefront_id\s*=\s*"([^"]+)"/m)?.[1] ?? '';
  const scopes =
    content.match(/^\[storefront_access_scopes\][\s\S]*?^scopes\s*=\s*"([^"]+)"/m)?.[1] ??
    '';
  return {storefrontId, scopes};
}

function main() {
  if (!existsSync(tomlPath)) {
    console.error('Missing shopify.storefront.toml');
    process.exit(1);
  }

  const {storefrontId, scopes} = parseStorefrontToml(
    readFileSync(tomlPath, 'utf8'),
  );

  if (!storefrontId || !scopes) {
    console.error('Invalid shopify.storefront.toml — need storefront_id and scopes');
    process.exit(1);
  }

  const scopeList = scopes.split(',').map((s) => s.trim()).filter(Boolean);

  console.log('Storefront API scopes (shopify.storefront.toml):');
  for (const scope of scopeList) {
    console.log(`  • ${scope}`);
  }
  console.log('');
  console.log('Hydrogen storefront:', storefrontId);
  console.log('');
  console.log('Enable these in Shopify Admin:');
  console.log('  1. Sales channels → Hydrogen → The Kashmir Weaver');
  console.log('  2. Storefront settings → Storefront API → Edit');
  console.log('  3. Turn on “Read product inventory” (unauthenticated_read_product_inventory)');
  console.log('  4. Save, then restart `npm run dev`');
  console.log('');

  const deployPartnerScopes = process.argv.includes('--deploy-partner-scopes');
  if (deployPartnerScopes) {
    console.log('Deploying shopify.app.toml access scopes to Partner app…');
    execSync('shopify app deploy --force --no-build', {
      cwd: root,
      stdio: 'inherit',
    });
  } else {
    console.log(
      'Optional: redeploy Partner app scopes with `npm run storefront:push-scopes -- --deploy-partner-scopes`',
    );
  }
}

main();
