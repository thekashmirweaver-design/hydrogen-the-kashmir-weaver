/**
 * Upload all Downloads pomelli products as DRAFT from catalog JSON.
 *
 * Usage:
 *   npx tsx scripts/upload-pomelli-downloads-drafts.ts [--dry-run] [--only 1,2,8]
 */
import {existsSync, readFileSync, writeFileSync} from 'node:fs';
import {basename, dirname, extname, join, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {homedir} from 'node:os';

const API_VERSION = '2025-10';
const VENDOR = 'MK';
const WEIGHT_GRAMS = 220;
const COUNTRY = 'IN';
const HS = '621420';
const CATEGORY_ID = 'gid://shopify/TaxonomyCategory/aa-2-26';
const LOCATION_ID = 'gid://shopify/Location/92787245271';
const STOREFRONT = 'https://thekashmirweaver.shop';

const COLOR_PATTERN_TYPE = 'shopify--color-pattern';
const PATTERN_SOLID = 'gid://shopify/TaxonomyValue/2874';
const FLORAL_METAOBJECT = 'gid://shopify/Metaobject/201411559639';

const TAXONOMY_COLORS: Record<string, string> = {
  White: 'gid://shopify/TaxonomyValue/3',
  Beige: 'gid://shopify/TaxonomyValue/6',
  Black: 'gid://shopify/TaxonomyValue/1',
  Blue: 'gid://shopify/TaxonomyValue/2',
  Brown: 'gid://shopify/TaxonomyValue/7',
  Gold: 'gid://shopify/TaxonomyValue/4',
  Gray: 'gid://shopify/TaxonomyValue/8',
  Green: 'gid://shopify/TaxonomyValue/9',
  Multicolor: 'gid://shopify/TaxonomyValue/2865',
  Orange: 'gid://shopify/TaxonomyValue/10',
  Pink: 'gid://shopify/TaxonomyValue/11',
  Purple: 'gid://shopify/TaxonomyValue/12',
  Red: 'gid://shopify/TaxonomyValue/13',
  Yellow: 'gid://shopify/TaxonomyValue/14',
};

const SHARED_SHOPIFY_METAFIELDS: Record<string, string[]> = {
  'accessory-size': ['gid://shopify/Metaobject/200385593559'],
  fabric: [
    'gid://shopify/Metaobject/200509685975',
    'gid://shopify/Metaobject/201411526871',
  ],
  'scarf-shawl-style': [
    'gid://shopify/Metaobject/200509718743',
    'gid://shopify/Metaobject/200509751511',
    'gid://shopify/Metaobject/200509784279',
    'gid://shopify/Metaobject/200509817047',
  ],
  'target-gender': ['gid://shopify/Metaobject/200509653207'],
  'age-group': ['gid://shopify/Metaobject/201411231959'],
  'care-instructions': ['gid://shopify/Metaobject/200822751447'],
  'edge-finish': ['gid://shopify/Metaobject/201411199191'],
};

const SHARED_CUSTOM = {
  care: 'Dry clean only — natural fibres require gentle care.',
  material: '100% Kashmir Pashmina Cashmere',
  origin: 'Srinagar, Kashmir, India',
  weave: 'Handloom',
  limited: 'false',
  featured_order: '2',
  show_colour_studio: 'false',
  shade_palette: '[]',
  guarantees_delivery: JSON.stringify([
    {title: 'Ships within', body: '24 hours of order placement'},
    {title: 'International delivery', body: '5–10 working days'},
    {title: 'India delivery', body: '2–5 working days'},
    {title: 'Free shipping', body: 'On orders over $200'},
    {title: 'Ships from', body: 'Kashmir, India'},
  ]),
  returns_care: JSON.stringify([
    {text: '100% refund for any manufacturing defect'},
    {text: 'All products quality-checked before dispatch'},
    {text: 'See Terms & Conditions for details', href: '/terms'},
    {text: 'Dry clean only — natural fibres require gentle care.'},
    {text: 'Slight variations are a mark of hand craftsmanship'},
  ]),
};

type CatalogItem = {
  index: number;
  folder: string;
  path: string;
  category: string;
  collection: string;
  productType: string;
  costInr: number;
  title: string;
  handle: string;
  sku: string;
  costUsd: string;
  sellUsd: string;
  seoTitle: string;
  seoDescription: string;
  tags: string[];
  descriptionHtml: string;
  googleColor: string;
  colorLabels: string[];
  includeFloral: boolean;
  storyHint: string;
  images: string[];
  notes: string[];
};

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
  const cfgPath = join(
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

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function mimeType(filePath: string): string {
  const ext = extname(filePath).toLowerCase();
  if (ext === '.png') return 'image/png';
  if (ext === '.webp') return 'image/webp';
  return 'image/jpeg';
}

async function adminGraphql<T>(
  shop: string,
  token: string,
  query: string,
  variables?: Record<string, unknown>,
  attempt = 0,
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
    const msg = json.errors.map((e) => e.message).join('; ');
    if (/throttl|rate|TIMEOUT/i.test(msg) && attempt < 5) {
      await sleep(2000 * (attempt + 1));
      return adminGraphql(shop, token, query, variables, attempt + 1);
    }
    throw new Error(msg);
  }
  if (!json.data) throw new Error('GraphQL response missing data');
  return json.data;
}

async function findCollectionId(
  shop: string,
  token: string,
  handle: string,
): Promise<string> {
  const data = await adminGraphql<{
    collectionByHandle: {id: string} | null;
  }>(
    shop,
    token,
    `query($handle: String!) { collectionByHandle(handle: $handle) { id } }`,
    {handle},
  );
  if (!data.collectionByHandle?.id) {
    throw new Error(`Collection not found: ${handle}`);
  }
  return data.collectionByHandle.id;
}

async function findProductByHandle(
  shop: string,
  token: string,
  handle: string,
): Promise<{id: string; status: string} | null> {
  const data = await adminGraphql<{
    productByHandle: {id: string; status: string} | null;
  }>(
    shop,
    token,
    `query($handle: String!) { productByHandle(handle: $handle) { id status } }`,
    {handle},
  );
  return data.productByHandle;
}

async function stageAndUpload(
  shop: string,
  token: string,
  filePath: string,
): Promise<string> {
  const {statSync} = await import('node:fs');
  const fileSize = statSync(filePath).size;
  const filename = basename(filePath).replace(/[^\w.\-() ]+/g, '_');
  const mime = mimeType(filePath);

  const staged = await adminGraphql<{
    stagedUploadsCreate: {
      stagedTargets: Array<{
        url: string;
        resourceUrl: string;
        parameters: Array<{name: string; value: string}>;
      }>;
      userErrors: Array<{message: string}>;
    };
  }>(
    shop,
    token,
    `#graphql
    mutation($input: [StagedUploadInput!]!) {
      stagedUploadsCreate(input: $input) {
        stagedTargets { url resourceUrl parameters { name value } }
        userErrors { field message }
      }
    }`,
    {
      input: [
        {
          filename,
          mimeType: mime,
          resource: 'PRODUCT_IMAGE',
          fileSize: String(fileSize),
          httpMethod: 'POST',
        },
      ],
    },
  );

  const target = staged.stagedUploadsCreate.stagedTargets[0];
  if (!target || staged.stagedUploadsCreate.userErrors.length) {
    throw new Error(
      `stagedUploadsCreate failed: ${JSON.stringify(staged.stagedUploadsCreate.userErrors)}`,
    );
  }

  const form = new FormData();
  for (const param of target.parameters) form.append(param.name, param.value);
  form.append(
    'file',
    new Blob([readFileSync(filePath)], {type: mime}),
    filename,
  );
  const uploadRes = await fetch(target.url, {method: 'POST', body: form});
  if (!uploadRes.ok) {
    throw new Error(
      `Upload failed ${filename}: ${uploadRes.status} ${(await uploadRes.text()).slice(0, 200)}`,
    );
  }
  return target.resourceUrl;
}

async function createProduct(
  shop: string,
  token: string,
  item: CatalogItem,
  media: Array<{originalSource: string; mediaContentType: string; alt: string}>,
) {
  const data = await adminGraphql<{
    productCreate: {
      product: {
        id: string;
        handle: string;
        variants: {
          nodes: Array<{id: string; inventoryItem: {id: string}}>;
        };
      } | null;
      userErrors: Array<{field?: string[]; message: string}>;
    };
  }>(
    shop,
    token,
    `#graphql
    mutation($product: ProductCreateInput!, $media: [CreateMediaInput!]) {
      productCreate(product: $product, media: $media) {
        product {
          id handle
          variants(first: 1) { nodes { id inventoryItem { id } } }
        }
        userErrors { field message }
      }
    }`,
    {
      product: {
        title: item.title,
        handle: item.handle,
        descriptionHtml: item.descriptionHtml,
        productType: item.productType,
        vendor: VENDOR,
        status: 'DRAFT',
        tags: item.tags,
        category: CATEGORY_ID,
        seo: {title: item.seoTitle, description: item.seoDescription},
      },
      media,
    },
  );
  if (data.productCreate.userErrors.length) {
    throw new Error(
      data.productCreate.userErrors
        .map((e) => `${(e.field ?? []).join('.')}: ${e.message}`)
        .join('; '),
    );
  }
  const created = data.productCreate.product!;
  const variant = created.variants.nodes[0];
  return {
    id: created.id,
    handle: created.handle,
    variantId: variant.id,
    inventoryItemId: variant.inventoryItem.id,
  };
}

async function setVariant(
  shop: string,
  token: string,
  productId: string,
  variantId: string,
  item: CatalogItem,
) {
  const data = await adminGraphql<{
    productVariantsBulkUpdate: {userErrors: Array<{message: string}>};
  }>(
    shop,
    token,
    `#graphql
    mutation($productId: ID!, $variants: [ProductVariantsBulkInput!]!) {
      productVariantsBulkUpdate(productId: $productId, variants: $variants) {
        userErrors { field message }
      }
    }`,
    {
      productId,
      variants: [
        {
          id: variantId,
          price: item.sellUsd,
          compareAtPrice: null,
          barcode: item.sku,
          inventoryItem: {
            sku: item.sku,
            tracked: true,
            cost: item.costUsd,
            requiresShipping: true,
          },
        },
      ],
    },
  );
  if (data.productVariantsBulkUpdate.userErrors.length) {
    throw new Error(
      data.productVariantsBulkUpdate.userErrors.map((e) => e.message).join('; '),
    );
  }
}

async function updateInventoryItem(
  shop: string,
  token: string,
  inventoryItemId: string,
  costUsd: string,
) {
  const data = await adminGraphql<{
    inventoryItemUpdate: {userErrors: Array<{message: string}>};
  }>(
    shop,
    token,
    `#graphql
    mutation($id: ID!, $input: InventoryItemInput!) {
      inventoryItemUpdate(id: $id, input: $input) {
        userErrors { field message }
      }
    }`,
    {
      id: inventoryItemId,
      input: {
        tracked: true,
        cost: costUsd,
        countryCodeOfOrigin: COUNTRY,
        harmonizedSystemCode: HS,
        measurement: {weight: {value: WEIGHT_GRAMS, unit: 'GRAMS'}},
      },
    },
  );
  if (data.inventoryItemUpdate.userErrors.length) {
    throw new Error(
      data.inventoryItemUpdate.userErrors.map((e) => e.message).join('; '),
    );
  }
}

async function setQty(
  shop: string,
  token: string,
  inventoryItemId: string,
) {
  const data = await adminGraphql<{
    inventorySetQuantities: {userErrors: Array<{message: string}>};
  }>(
    shop,
    token,
    `#graphql
    mutation($input: InventorySetQuantitiesInput!) {
      inventorySetQuantities(input: $input) {
        userErrors { field message code }
      }
    }`,
    {
      input: {
        name: 'available',
        reason: 'correction',
        ignoreCompareQuantity: true,
        quantities: [
          {inventoryItemId, locationId: LOCATION_ID, quantity: 1},
        ],
      },
    },
  );
  if (data.inventorySetQuantities.userErrors.length) {
    throw new Error(
      data.inventorySetQuantities.userErrors.map((e) => e.message).join('; '),
    );
  }
}

async function addToCollection(
  shop: string,
  token: string,
  collectionId: string,
  productId: string,
) {
  const data = await adminGraphql<{
    collectionAddProducts: {userErrors: Array<{message: string}>};
  }>(
    shop,
    token,
    `#graphql
    mutation($id: ID!, $productIds: [ID!]!) {
      collectionAddProducts(id: $id, productIds: $productIds) {
        userErrors { message }
      }
    }`,
    {id: collectionId, productIds: [productId]},
  );
  if (data.collectionAddProducts.userErrors.length) {
    throw new Error(
      data.collectionAddProducts.userErrors.map((e) => e.message).join('; '),
    );
  }
}

function colorPatternHandle(label: string): string {
  return `${label.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-solid`;
}

const colorPatternCache = new Map<string, string>();

async function ensureColorPattern(
  shop: string,
  token: string,
  label: string,
): Promise<string> {
  if (colorPatternCache.has(label)) return colorPatternCache.get(label)!;
  const taxonomyGid = TAXONOMY_COLORS[label];
  if (!taxonomyGid) throw new Error(`No taxonomy color for ${label}`);
  const data = await adminGraphql<{
    metaobjectUpsert: {
      metaobject: {id: string} | null;
      userErrors: Array<{message: string}>;
    };
  }>(
    shop,
    token,
    `#graphql
    mutation($handle: MetaobjectHandleInput!, $metaobject: MetaobjectUpsertInput!) {
      metaobjectUpsert(handle: $handle, metaobject: $metaobject) {
        metaobject { id }
        userErrors { field message }
      }
    }`,
    {
      handle: {type: COLOR_PATTERN_TYPE, handle: colorPatternHandle(label)},
      metaobject: {
        fields: [
          {key: 'label', value: label},
          {
            key: 'color_taxonomy_reference',
            value: JSON.stringify([taxonomyGid]),
          },
          {key: 'pattern_taxonomy_reference', value: PATTERN_SOLID},
        ],
      },
    },
  );
  if (data.metaobjectUpsert.userErrors.length) {
    throw new Error(
      data.metaobjectUpsert.userErrors.map((e) => e.message).join('; '),
    );
  }
  const id = data.metaobjectUpsert.metaobject!.id;
  colorPatternCache.set(label, id);
  return id;
}

async function setMetafields(
  shop: string,
  token: string,
  productGid: string,
  variantId: string,
  item: CatalogItem,
  colorPatternIds: string[],
) {
  const story = `Handwoven ${item.category} pashmina — ${item.storyHint} — every thread carries the silence of the Changthang plateau.`;
  const short = `A one-of-a-kind handwoven ${item.category} cashmere pashmina with ${item.storyHint}. Individually crafted in Kashmir.`;
  const colorIds = item.includeFloral
    ? [...colorPatternIds, FLORAL_METAOBJECT]
    : colorPatternIds;

  const metafields = [
    {ownerId: productGid, namespace: 'custom', key: 'care', type: 'single_line_text_field', value: SHARED_CUSTOM.care},
    {ownerId: productGid, namespace: 'custom', key: 'material', type: 'single_line_text_field', value: SHARED_CUSTOM.material},
    {ownerId: productGid, namespace: 'custom', key: 'origin', type: 'single_line_text_field', value: SHARED_CUSTOM.origin},
    {ownerId: productGid, namespace: 'custom', key: 'weave', type: 'single_line_text_field', value: SHARED_CUSTOM.weave},
    {ownerId: productGid, namespace: 'custom', key: 'limited', type: 'boolean', value: SHARED_CUSTOM.limited},
    {ownerId: productGid, namespace: 'custom', key: 'featured_order', type: 'number_integer', value: SHARED_CUSTOM.featured_order},
    {ownerId: productGid, namespace: 'custom', key: 'show_colour_studio', type: 'boolean', value: SHARED_CUSTOM.show_colour_studio},
    {ownerId: productGid, namespace: 'custom', key: 'shade_palette', type: 'json', value: SHARED_CUSTOM.shade_palette},
    {ownerId: productGid, namespace: 'custom', key: 'guarantees_delivery', type: 'json', value: SHARED_CUSTOM.guarantees_delivery},
    {ownerId: productGid, namespace: 'custom', key: 'returns_care', type: 'json', value: SHARED_CUSTOM.returns_care},
    {ownerId: productGid, namespace: 'custom', key: 'story', type: 'multi_line_text_field', value: story},
    {ownerId: productGid, namespace: 'custom', key: 'short_description', type: 'single_line_text_field', value: short},
    {ownerId: productGid, namespace: 'mm-google-shopping', key: 'age_group', type: 'single_line_text_field', value: 'adult'},
    {ownerId: productGid, namespace: 'mm-google-shopping', key: 'condition', type: 'single_line_text_field', value: 'new'},
    {ownerId: productGid, namespace: 'mm-google-shopping', key: 'gender', type: 'single_line_text_field', value: 'unisex'},
    ...Object.entries(SHARED_SHOPIFY_METAFIELDS).map(([key, ids]) => ({
      ownerId: productGid,
      namespace: 'shopify',
      key,
      type: 'list.metaobject_reference',
      value: JSON.stringify(ids),
    })),
    {
      ownerId: productGid,
      namespace: 'shopify',
      key: 'color-pattern',
      type: 'list.metaobject_reference',
      value: JSON.stringify(colorIds),
    },
    {ownerId: variantId, namespace: 'mm-google-shopping', key: 'age_group', type: 'single_line_text_field', value: 'adult'},
    {ownerId: variantId, namespace: 'mm-google-shopping', key: 'condition', type: 'single_line_text_field', value: 'new'},
    {ownerId: variantId, namespace: 'mm-google-shopping', key: 'gender', type: 'single_line_text_field', value: 'unisex'},
    {ownerId: variantId, namespace: 'mm-google-shopping', key: 'mpn', type: 'single_line_text_field', value: item.sku},
    {ownerId: variantId, namespace: 'mm-google-shopping', key: 'color', type: 'single_line_text_field', value: item.googleColor},
    {ownerId: variantId, namespace: 'global', key: 'harmonized_system_code', type: 'string', value: HS},
  ];

  for (let i = 0; i < metafields.length; i += 25) {
    const chunk = metafields.slice(i, i + 25);
    const data = await adminGraphql<{
      metafieldsSet: {userErrors: Array<{message: string; field?: string[]}>};
    }>(
      shop,
      token,
      `#graphql
      mutation($metafields: [MetafieldsSetInput!]!) {
        metafieldsSet(metafields: $metafields) {
          userErrors { field message }
        }
      }`,
      {metafields: chunk},
    );
    if (data.metafieldsSet.userErrors.length) {
      throw new Error(
        data.metafieldsSet.userErrors
          .map((e) => `${(e.field ?? []).join('.')}: ${e.message}`)
          .join('; '),
      );
    }
    await sleep(150);
  }
}

function parseArgs(argv: string[]) {
  const dryRun = argv.includes('--dry-run');
  let only: number[] | null = null;
  const idx = argv.indexOf('--only');
  if (idx !== -1 && argv[idx + 1]) {
    only = argv[idx + 1].split(',').map((s) => Number(s.trim()));
  }
  return {dryRun, only};
}

async function main() {
  loadEnvFile();
  const {dryRun, only} = parseArgs(process.argv.slice(2));
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

  const catalogPath = resolve(
    dirname(fileURLToPath(import.meta.url)),
    'data/pomelli-downloads-catalog.json',
  );
  let catalog = JSON.parse(readFileSync(catalogPath, 'utf8')) as CatalogItem[];
  if (only) catalog = catalog.filter((c) => only.includes(c.index));

  console.log(`\nStore: ${shop}`);
  console.log(`Products: ${catalog.length}${dryRun ? ' (DRY RUN)' : ''}`);
  console.log('Status: DRAFT | FX 96.51 | sell=floor(2.5×cost/10)×10\n');

  const collectionCache = new Map<string, string>();
  for (const handle of [...new Set(catalog.map((c) => c.collection))]) {
    const id = await findCollectionId(shop, token, handle);
    collectionCache.set(handle, id);
    console.log(`  ✓ collection ${handle} → ${id}`);
  }

  const results: Array<Record<string, unknown>> = [];

  for (const item of catalog) {
    console.log(
      `\n── #${item.index} [${item.collection}] ${item.handle} | INR ${item.costInr} → $${item.costUsd}/$${item.sellUsd}`,
    );
    try {
      for (const img of item.images) {
        if (!existsSync(img)) throw new Error(`Missing image: ${img}`);
      }

      const existing = await findProductByHandle(shop, token, item.handle);
      if (existing) {
        console.log(`  · exists ${existing.id} (${existing.status}) — skip`);
        results.push({
          index: item.index,
          handle: item.handle,
          status: 'skipped',
          productId: existing.id,
        });
        continue;
      }

      if (dryRun) {
        console.log(`  · would upload ${item.images.length} images as DRAFT`);
        results.push({
          index: item.index,
          handle: item.handle,
          status: 'dry-run',
          images: item.images.length,
          sellUsd: item.sellUsd,
          costUsd: item.costUsd,
          collection: item.collection,
        });
        continue;
      }

      const urls: string[] = [];
      for (const [i, filePath] of item.images.entries()) {
        process.stdout.write(
          `  staging ${i + 1}/${item.images.length} ${basename(filePath)}… `,
        );
        urls.push(await stageAndUpload(shop, token, filePath));
        console.log('ok');
        await sleep(200);
      }

      const media = urls.map((originalSource, i) => ({
        originalSource,
        mediaContentType: 'IMAGE',
        alt: `${item.title} — image ${i + 1}`,
      }));

      process.stdout.write('  creating DRAFT… ');
      const created = await createProduct(shop, token, item, media);
      console.log(created.id);

      process.stdout.write('  price/cost/sku… ');
      await setVariant(shop, token, created.id, created.variantId, item);
      console.log('ok');

      process.stdout.write('  inventory details… ');
      await updateInventoryItem(
        shop,
        token,
        created.inventoryItemId,
        item.costUsd,
      );
      await setQty(shop, token, created.inventoryItemId);
      console.log('ok');

      process.stdout.write(`  collection ${item.collection}… `);
      await addToCollection(
        shop,
        token,
        collectionCache.get(item.collection)!,
        created.id,
      );
      console.log('ok');

      process.stdout.write('  metafields… ');
      const colorIds: string[] = [];
      for (const label of item.colorLabels) {
        if (TAXONOMY_COLORS[label]) {
          colorIds.push(await ensureColorPattern(shop, token, label));
        }
      }
      await setMetafields(
        shop,
        token,
        created.id,
        created.variantId,
        item,
        colorIds,
      );
      console.log('ok');

      const numericId = created.id.split('/').pop();
      const adminUrl = `https://${shop}/admin/products/${numericId}`;
      console.log(`  ✓ ${adminUrl}`);

      results.push({
        index: item.index,
        folder: item.folder,
        handle: created.handle,
        status: 'created',
        productId: created.id,
        adminUrl,
        storefrontUrl: `${STOREFRONT}/products/${created.handle}`,
        collection: item.collection,
        costInr: item.costInr,
        costUsd: item.costUsd,
        sellUsd: item.sellUsd,
        images: urls.length,
      });
      await sleep(300);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(`  ✗ FAILED: ${message}`);
      results.push({
        index: item.index,
        handle: item.handle,
        status: 'failed',
        error: message,
      });
    }
  }

  const outPath = resolve(
    dirname(fileURLToPath(import.meta.url)),
    '../pomelli-downloads-upload-results.json',
  );
  writeFileSync(outPath, JSON.stringify(results, null, 2));
  const created = results.filter((r) => r.status === 'created').length;
  const skipped = results.filter((r) => r.status === 'skipped').length;
  const failed = results.filter((r) => r.status === 'failed').length;
  console.log(
    `\nDone. created=${created} skipped=${skipped} failed=${failed}`,
  );
  console.log(`Results: ${outPath}\n`);
  if (failed > 0) process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
