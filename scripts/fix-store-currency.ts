/**
 * Fix storefront currency: correct variant prices and (optionally) create Shopify Markets.
 *
 * Prices are synced from app/models/static/catalog.ts (USD). When the shop currency
 * is INR, amounts are converted at USD_TO_INR_RATE.
 *
 * Run:
 *   npm run auth:sync-env
 *   npm run fix:currency              # prices only
 *   npm run fix:currency -- --markets # prices + Markets (needs read_markets/write_markets)
 */
import {existsSync, readFileSync} from 'node:fs';
import {dirname, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {products} from '../app/models/static/repository.ts';

const USD_TO_INR_RATE = 83;
const DEFAULT_USD_PRICE = 980;
const DEFAULT_USD_COMPARE_AT = 1250;
const API_VERSION = '2025-01';

/** Catalog prices are authored in USD; convert when the shop bills in INR. */
const INTERNATIONAL_MARKETS = [
  {name: 'United States', handle: 'united-states', countryCode: 'US', currency: 'USD'},
  {name: 'United Kingdom', handle: 'united-kingdom', countryCode: 'GB', currency: 'GBP'},
  {name: 'Canada', handle: 'canada', countryCode: 'CA', currency: 'CAD'},
  {name: 'Australia', handle: 'australia', countryCode: 'AU', currency: 'AUD'},
  {name: 'United Arab Emirates', handle: 'uae', countryCode: 'AE', currency: 'AED'},
  {name: 'Germany', handle: 'germany', countryCode: 'DE', currency: 'EUR'},
  {name: 'France', handle: 'france', countryCode: 'FR', currency: 'EUR'},
  {name: 'Singapore', handle: 'singapore', countryCode: 'SG', currency: 'SGD'},
] as const;

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
const setupMarkets = process.argv.includes('--markets');

if (!SHOP || !TOKEN) {
  console.error('Missing env: PUBLIC_STORE_DOMAIN, SHOPIFY_ADMIN_ACCESS_TOKEN');
  console.error('Run: npm run auth:sync-env');
  process.exit(1);
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

const catalogByHandle = new Map(products.map((p) => [p.handle, p]));

function formatMoney(amount: number): string {
  return amount.toFixed(2);
}

function usdToShopAmount(usd: number, shopCurrency: string): number {
  if (shopCurrency === 'USD') return usd;
  if (shopCurrency === 'INR') return Math.round(usd * USD_TO_INR_RATE);
  return usd;
}

function resolveUsdPrices(handle: string): {price: number; compareAt?: number} {
  const catalog = catalogByHandle.get(handle);
  if (catalog) {
    return {
      price: catalog.price.amount,
      compareAt: catalog.compareAtPrice?.amount,
    };
  }
  return {price: DEFAULT_USD_PRICE, compareAt: DEFAULT_USD_COMPARE_AT};
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

async function getShopCurrency(): Promise<string> {
  const data = await adminGraphql<{shop: {currencyCode: string}}>(
    `query { shop { currencyCode } }`,
  );
  return data.shop.currencyCode;
}

type AdminProduct = {
  id: string;
  handle: string;
  title: string;
  variants: {
    nodes: Array<{id: string; price: string; compareAtPrice: string | null}>;
  };
};

async function listProducts(): Promise<AdminProduct[]> {
  const data = await adminGraphql<{products: {nodes: AdminProduct[]}}>(
    `#graphql
    query {
      products(first: 250) {
        nodes {
          id
          handle
          title
          variants(first: 100) {
            nodes { id price compareAtPrice }
          }
        }
      }
    }`,
  );
  return data.products.nodes;
}

async function fixProductPrices(shopCurrency: string) {
  const shopProducts = await listProducts();
  let updated = 0;

  for (const product of shopProducts) {
    const {price: usdPrice, compareAt: usdCompareAt} = resolveUsdPrices(
      product.handle,
    );
    const price = usdToShopAmount(usdPrice, shopCurrency);
    const compareAt =
      usdCompareAt != null
        ? usdToShopAmount(usdCompareAt, shopCurrency)
        : undefined;

    const variants = product.variants.nodes.map((variant) => ({
      id: variant.id,
      price: formatMoney(price),
      compareAtPrice:
        compareAt != null ? formatMoney(compareAt) : undefined,
    }));

    const currentPrices = new Set(
      product.variants.nodes.map((v) => `${v.price}|${v.compareAtPrice ?? ''}`),
    );
    const target = `${formatMoney(price)}|${compareAt != null ? formatMoney(compareAt) : ''}`;
    if (
      currentPrices.size === 1 &&
      currentPrices.has(target) &&
      product.variants.nodes.length === variants.length
    ) {
      console.log(`  · skip ${product.handle} (prices already correct)`);
      continue;
    }

    const result = await adminGraphql<{
      productVariantsBulkUpdate: {
        productVariants: Array<{id: string; price: string}>;
        userErrors: Array<{field: string[]; message: string}>;
      };
    }>(
      `#graphql
      mutation FixPrices($productId: ID!, $variants: [ProductVariantsBulkInput!]!) {
        productVariantsBulkUpdate(productId: $productId, variants: $variants) {
          productVariants { id price }
          userErrors { field message }
        }
      }`,
      {
        productId: product.id,
        variants,
      },
    );

    if (result.productVariantsBulkUpdate.userErrors.length) {
      throw new Error(
        `${product.handle}: ${result.productVariantsBulkUpdate.userErrors[0].message}`,
      );
    }

    const suffix =
      shopCurrency === 'USD'
        ? `$${price}`
        : `${shopCurrency} ${price.toLocaleString('en-IN')}`;
    console.log(`  ✓ ${product.handle} → ${suffix}`);
    updated++;
    await sleep(350);
  }

  return updated;
}

async function listExistingMarkets(): Promise<Array<{id: string; handle: string}>> {
  const data = await adminGraphql<{
    markets: {nodes: Array<{id: string; handle: string; name: string}>};
  }>(
    `#graphql
    query {
      markets(first: 50) {
        nodes { id handle name }
      }
    }`,
  );
  return data.markets.nodes;
}

async function createMarket(market: (typeof INTERNATIONAL_MARKETS)[number]) {
  const result = await adminGraphql<{
    marketCreate: {
      market: {id: string; handle: string} | null;
      userErrors: Array<{field: string[]; message: string; code?: string}>;
    };
  }>(
    `#graphql
    mutation CreateMarket($input: MarketCreateInput!) {
      marketCreate(input: $input) {
        market { id handle }
        userErrors { field message code }
      }
    }`,
    {
      input: {
        name: market.name,
        handle: market.handle,
        enabled: true,
        conditions: {
          regionsCondition: {
            regions: [{countryCode: market.countryCode}],
          },
        },
        currencySettings: {
          baseCurrency: market.currency,
          localCurrencies: false,
        },
      },
    },
  );

  if (result.marketCreate.userErrors.length) {
    const err = result.marketCreate.userErrors[0];
    if (err.code === 'TAKEN' || /already exists/i.test(err.message)) {
      console.log(`  · skip ${market.handle} (already exists)`);
      return;
    }
    throw new Error(`${market.handle}: ${err.message}`);
  }

  console.log(`  ✓ market ${market.handle} (${market.currency})`);
  await sleep(400);
}

async function setupInternationalMarkets() {
  const existing = await listExistingMarkets();
  const existingHandles = new Set(existing.map((m) => m.handle));
  console.log(`Found ${existing.length} existing market(s).`);

  for (const market of INTERNATIONAL_MARKETS) {
    if (existingHandles.has(market.handle)) {
      console.log(`  · skip ${market.handle} (already exists)`);
      continue;
    }
    await createMarket(market);
  }
}

async function main() {
  console.log(`\nFixing storefront currency on ${SHOP}…\n`);

  const shopCurrency = await getShopCurrency();
  console.log(`Shop currency: ${shopCurrency}`);
  if (shopCurrency === 'INR') {
    console.log(
      `Converting catalog USD prices at 1 USD = ${USD_TO_INR_RATE} INR.`,
    );
    console.log(
      'Tip: Settings → Store details → change currency to USD for USD-native pricing.\n',
    );
  }

  console.log('Updating product variant prices…');
  const updated = await fixProductPrices(shopCurrency);
  console.log(`\nUpdated ${updated} product(s).`);

  if (setupMarkets) {
    console.log('\nSetting up international markets…');
    try {
      await setupInternationalMarkets();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (/read_markets|write_markets|ACCESS_DENIED/i.test(message)) {
        console.error(
          '\nMarkets API access denied. Re-authenticate with markets scopes:\n',
        );
        console.error('  npm run auth:deploy-scopes');
        console.error('  npm run auth:store');
        console.error('  npm run auth:sync-env');
        console.error('  npm run fix:currency -- --markets\n');
        process.exit(1);
      }
      throw error;
    }
  } else {
    console.log(
      '\nRun `npm run fix:currency -- --markets` after auth includes read_markets/write_markets.',
    );
  }

  console.log('\nDone.\n');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
