/**
 * Solids SEO rollout:
 * - Product title: {Color} Cashmere Scarf & Pashmina Shawl — Handwoven in Kashmir
 * - SEO title:     {Color} Cashmere Scarf & Pashmina Shawl | Handwoven Kashmir | The Kashmir Weaver
 * - SEO description + rename Accessory size → Size (variant labels)
 *
 * Run: npx tsx scripts/update-solids-titles-seo-sizes.ts
 * Dry: npx tsx scripts/update-solids-titles-seo-sizes.ts --dry-run
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

const SHOP = process.env.PUBLIC_STORE_DOMAIN ?? '';
const TOKEN = process.env.SHOPIFY_ADMIN_ACCESS_TOKEN ?? '';
const API_VERSION = '2025-01';
const DRY_RUN = process.argv.includes('--dry-run');
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

const SIZE_RENAMES: Array<{match: RegExp; name: string}> = [
  {match: /^stole\b/i, name: 'Stole / Scarf (70×200 cm)'},
  {match: /^shawl\b/i, name: 'Shawl (100×200 cm)'},
  {match: /^square\s*scarf\b/i, name: 'Square Scarf (137×137 cm)'},
  {
    match: /^(oversized\s*wrap\s*\/\s*)?3\s*yard\b/i,
    name: 'Oversized Wrap / 3 Yard (137×274 cm)',
  },
];

if (!SHOP || !TOKEN) {
  console.error('Missing env: PUBLIC_STORE_DOMAIN, SHOPIFY_ADMIN_ACCESS_TOKEN');
  process.exit(1);
}

async function adminGraphql(
  query: string,
  variables?: Record<string, unknown>,
  attempt = 0,
): Promise<any> {
  let res: Response;
  try {
    res = await fetch(
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
  } catch (err) {
    if (attempt < 3) {
      await sleep(2000 * (attempt + 1));
      return adminGraphql(query, variables, attempt + 1);
    }
    throw err;
  }
  const json = await res.json();
  if (json.errors?.length) {
    const msg = json.errors.map((e: {message: string}) => e.message).join('; ');
    if (/throttl|rate|exceeded/i.test(msg) && attempt < 6) {
      const wait = 3000 * (attempt + 1);
      console.log(`  ⚠ rate-limit; waiting ${wait}ms`);
      await sleep(wait);
      return adminGraphql(query, variables, attempt + 1);
    }
    throw new Error(msg);
  }
  return json.data;
}

type OptionValue = {id: string; name: string};
type ProductOption = {
  id: string;
  name: string;
  optionValues: OptionValue[];
};
type ProductNode = {
  id: string;
  handle: string;
  title: string;
  seo: {title: string | null; description: string | null};
  options: ProductOption[];
};

function extractColor(product: ProductNode): string {
  const colorOpt = product.options.find((o) => /^color$/i.test(o.name));
  const fromOption = colorOpt?.optionValues?.[0]?.name?.trim();
  if (fromOption) return fromOption;

  const title = product.title.trim();
  const newFmt = title.match(
    /^(.+?)\s+Cashmere Scarf & Pashmina Shawl/i,
  );
  if (newFmt?.[1]) return newFmt[1].trim();

  const oldFmt = title.match(
    /^Handwoven Luxury Solid\s+(.+?)\s+Cashmere Pashmina/i,
  );
  if (oldFmt?.[1]) return oldFmt[1].trim();

  if (/authentic/i.test(title)) return 'Authentic';
  return title.replace(/\s+/g, ' ').trim() || 'Cashmere';
}

function buildTitle(color: string) {
  return `${color} Cashmere Scarf & Pashmina Shawl — Handwoven in Kashmir`;
}

function buildSeoTitle(color: string) {
  return `${color} Cashmere Scarf & Pashmina Shawl | Handwoven Kashmir | The Kashmir Weaver`;
}

function buildSeoDescription(color: string) {
  const lower = color.toLowerCase();
  return `Buy a ${lower} handwoven Kashmir cashmere scarf and pashmina shawl. Authentic, lightweight, and made for everyday luxury. Ships worldwide.`;
}

function findSizeOption(product: ProductNode) {
  return (
    product.options.find((o) => /accessory\s*size|^size$/i.test(o.name)) ??
    product.options.find((o) =>
      o.optionValues.some((v) =>
        SIZE_RENAMES.some((r) => r.match.test(v.name)),
      ),
    )
  );
}

function plannedSizeUpdates(option: ProductOption) {
  const updates: Array<{id: string; name: string; from: string}> = [];
  for (const value of option.optionValues) {
    const rule = SIZE_RENAMES.find((r) => r.match.test(value.name));
    if (!rule) continue;
    if (value.name === rule.name) continue;
    updates.push({id: value.id, name: rule.name, from: value.name});
  }
  return updates;
}

function needsTitleSeoUpdate(product: ProductNode, color: string) {
  const title = buildTitle(color);
  const seoTitle = buildSeoTitle(color);
  const seoDescription = buildSeoDescription(color);
  return (
    product.title !== title ||
    (product.seo?.title ?? '') !== seoTitle ||
    (product.seo?.description ?? '') !== seoDescription
  );
}

async function listSolidsProducts(): Promise<ProductNode[]> {
  const products: ProductNode[] = [];
  let cursor: string | null = null;
  do {
    const data = await adminGraphql(
      `#graphql
      query Solids($cursor: String) {
        collectionByHandle(handle: "solids") {
          products(first: 25, after: $cursor) {
            pageInfo { hasNextPage endCursor }
            nodes {
              id
              handle
              title
              seo { title description }
              options {
                id
                name
                optionValues { id name }
              }
            }
          }
        }
      }`,
      {cursor},
    );
    const page = data.collectionByHandle.products;
    products.push(...page.nodes);
    cursor = page.pageInfo.hasNextPage ? page.pageInfo.endCursor : null;
    await sleep(200);
  } while (cursor);
  return products;
}

async function updateTitleSeo(productId: string, color: string) {
  const data = await adminGraphql(
    `#graphql
    mutation productUpdate($product: ProductUpdateInput!) {
      productUpdate(product: $product) {
        product { id title seo { title description } }
        userErrors { field message }
      }
    }`,
    {
      product: {
        id: productId,
        title: buildTitle(color),
        seo: {
          title: buildSeoTitle(color),
          description: buildSeoDescription(color),
        },
      },
    },
  );
  const errs = data?.productUpdate?.userErrors ?? [];
  if (errs.length) throw new Error(`title/seo: ${errs[0].message}`);
}

async function updateSizeOption(
  productId: string,
  option: ProductOption,
  valueUpdates: Array<{id: string; name: string}>,
) {
  const data = await adminGraphql(
    `#graphql
    mutation productOptionUpdate(
      $productId: ID!
      $option: OptionUpdateInput!
      $optionValuesToUpdate: [OptionValueUpdateInput!]
    ) {
      productOptionUpdate(
        productId: $productId
        option: $option
        optionValuesToUpdate: $optionValuesToUpdate
      ) {
        userErrors { field message code }
      }
    }`,
    {
      productId,
      option: {id: option.id, name: 'Size'},
      optionValuesToUpdate: valueUpdates.map((v) => ({
        id: v.id,
        name: v.name,
      })),
    },
  );
  const errs = data?.productOptionUpdate?.userErrors ?? [];
  if (errs.length) {
    throw new Error(
      `size: ${errs[0].message}${errs[0].code ? ` (${errs[0].code})` : ''}`,
    );
  }
}

async function main() {
  console.log(
    `\nUpdating solids titles/SEO/sizes on ${SHOP}${DRY_RUN ? ' (dry-run)' : ''}\n`,
  );
  const products = await listSolidsProducts();
  console.log(`Found ${products.length} solids products\n`);

  let titleUpdated = 0;
  let sizeUpdated = 0;
  let skipped = 0;
  let failed = 0;

  for (let i = 0; i < products.length; i++) {
    const product = products[i];
    const color = extractColor(product);
    const sizeOption = findSizeOption(product);
    const sizeValueUpdates = sizeOption
      ? plannedSizeUpdates(sizeOption)
      : [];
    const renameOption =
      !!sizeOption && !/^size$/i.test(sizeOption.name);
    const needTitle = needsTitleSeoUpdate(product, color);
    const needSize = renameOption || sizeValueUpdates.length > 0;

    if (!needTitle && !needSize) {
      skipped++;
      continue;
    }

    const n = `[${i + 1}/${products.length}]`;
    try {
      if (needTitle) {
        console.log(
          `${n} title/seo → ${buildTitle(color)} (${product.handle})`,
        );
        if (!DRY_RUN) {
          await updateTitleSeo(product.id, color);
          await sleep(250);
        }
        titleUpdated++;
      }

      if (needSize && sizeOption) {
        console.log(
          `${n} size → Size` +
            (sizeValueUpdates.length
              ? ` (${sizeValueUpdates.map((u) => `${u.from}→${u.name}`).join('; ')})`
              : ' (option name only)'),
        );
        if (!DRY_RUN) {
          await updateSizeOption(
            product.id,
            sizeOption,
            sizeValueUpdates.map(({id, name}) => ({id, name})),
          );
          await sleep(250);
        }
        sizeUpdated++;
      }
    } catch (err) {
      failed++;
      console.error(
        `${n} FAILED ${product.handle}:`,
        err instanceof Error ? err.message : err,
      );
      await sleep(1000);
    }
  }

  console.log('\nDone');
  console.log(`  title/seo updated: ${titleUpdated}`);
  console.log(`  size updated:      ${sizeUpdated}`);
  console.log(`  skipped (already): ${skipped}`);
  console.log(`  failed:            ${failed}`);
  if (failed) process.exitCode = 1;
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
