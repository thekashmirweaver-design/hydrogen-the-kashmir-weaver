/**
 * Upload Kani DRAFT products for folders 1 and 2 only.
 *
 * Pricing:
 *   costUsd = round(INR / 96.51, 2)
 *   sellUsd = floor(costUsd * 2.5 / 10) * 10
 *
 * Status: DRAFT only — never publishes.
 *
 * Usage:
 *   npx tsx scripts/upload-kani-1-2-drafts.ts [--dry-run]
 *
 * Auth: uses SHOPIFY_ADMIN_ACCESS_TOKEN from .env, or falls back to
 * Shopify CLI store auth token for 70yuey-sr.myshopify.com.
 */
import {existsSync, readFileSync, writeFileSync} from 'node:fs';
import {basename, dirname, extname, join, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {homedir} from 'node:os';

const API_VERSION = '2025-10';
const FX = 96.51;
const BASE_DIR =
  '/Users/iambqc/Downloads/THE KASHMIR WEAVER/PRODUCTS/GENERATED/MUDASIR/Series 1/KANI';
const FOLDERS = [1, 2] as const;
const COLLECTION_HANDLES = ['kani', 'homepage-featured'] as const;
const VENDOR = 'MK';
const PRODUCT_TYPE = 'Kani';
const WEIGHT_GRAMS = 220;
const COUNTRY = 'IN';
const HS = '621420';
const CATEGORY_ID = 'gid://shopify/TaxonomyCategory/aa-2-26';
const LOCATION_ID = 'gid://shopify/Location/92787245271';
const STOREFRONT = 'https://thekashmirweaver.shop';

const COLOR_PATTERN_TYPE = 'shopify--color-pattern';
const PATTERN_SOLID = 'gid://shopify/TaxonomyValue/2874';
const PATTERN_FLORAL = 'gid://shopify/TaxonomyValue/2871';
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

type FolderSpec = {
  folder: number;
  googleColor: string;
  colorLabels: string[];
  includeFloral: boolean;
  storyHint: string;
};

const SPECS: Record<number, FolderSpec> = {
  1: {
    folder: 1,
    googleColor: 'Multicolor',
    colorLabels: ['Black', 'Purple', 'Pink', 'Beige', 'Multicolor'],
    includeFloral: true,
    storyHint: 'multicolor vertical stripe floral vine',
  },
  2: {
    folder: 2,
    googleColor: 'Cream',
    colorLabels: ['Beige', 'Brown', 'Pink', 'Purple', 'Blue'],
    includeFloral: true,
    storyHint: 'cream taupe floral jaal with mihrab border',
  },
};

type ParsedProduct = {
  folder: number;
  title: string;
  handle: string;
  seoTitle: string;
  seoDescription: string;
  tags: string[];
  sku: string;
  costInr: number;
  costUsd: string;
  sellUsd: string;
  descriptionHtml: string;
  imagePaths: string[];
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

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

function mimeType(filePath: string): string {
  const ext = extname(filePath).toLowerCase();
  if (ext === '.png') return 'image/png';
  if (ext === '.webp') return 'image/webp';
  if (ext === '.gif') return 'image/gif';
  return 'image/jpeg';
}

function grab(text: string, label: string): string {
  const m = text.match(new RegExp(`^${label}:\\s*(.+)$`, 'm'));
  if (!m) throw new Error(`Missing ${label}`);
  return m[1].trim();
}

function computeSell(costUsd: number): string {
  return String(Math.floor((costUsd * 2.5) / 10) * 10) + '.00';
}

function parseProductTxt(folder: number): ParsedProduct {
  const dir = join(BASE_DIR, String(folder));
  const txtPath = join(dir, 'product.txt');
  if (!existsSync(txtPath)) throw new Error(`No product.txt in folder ${folder}`);
  const text = readFileSync(txtPath, 'utf8');

  const title = grab(text, 'Title');
  const handle = grab(text, 'Handle');
  const seoTitle = grab(text, 'SEO Title');
  const seoDescription = grab(text, 'SEO Description');
  const tags = grab(text, 'Tags')
    .split(',')
    .map((t) => t.trim())
    .filter(Boolean);
  const skuMatch = text.match(/SKU \(suggested\):\s*(\S+)/);
  const sku = skuMatch?.[1] ?? `TKW-KANI-${113 + folder}-M`;
  const costInr = Number(grab(text, 'Cost INR'));
  const costUsdNum = Math.round((costInr / FX) * 100) / 100;
  const costUsd = costUsdNum.toFixed(2);
  const sellUsd = computeSell(costUsdNum);

  const imgsSection = text.match(
    /## Images to Attach[^\n]*\n((?:[ \t]*- .+\n)+)/,
  );
  if (!imgsSection) throw new Error(`No image list in folder ${folder}`);
  const imageNames = [...imgsSection[1].matchAll(/[ \t]*- (.+)/g)].map((m) =>
    m[1].trim(),
  );
  const imagePaths = imageNames.map((name) => {
    const p = join(dir, name);
    if (!existsSync(p)) throw new Error(`Missing image: ${p}`);
    return p;
  });

  const descMatch = text.match(
    /## Product Description \(HTML\)\n([\s\S]+?)(?:\n## |\n*$)/,
  );
  if (!descMatch) throw new Error(`No description HTML in folder ${folder}`);

  return {
    folder,
    title,
    handle,
    seoTitle,
    seoDescription,
    tags,
    sku,
    costInr,
    costUsd,
    sellUsd,
    descriptionHtml: descMatch[1].trim(),
    imagePaths,
  };
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
    `query($handle: String!) {
      collectionByHandle(handle: $handle) { id }
    }`,
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
): Promise<{id: string; handle: string; status: string} | null> {
  const data = await adminGraphql<{
    productByHandle: {id: string; handle: string; status: string} | null;
  }>(
    shop,
    token,
    `query($handle: String!) {
      productByHandle(handle: $handle) { id handle status }
    }`,
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
  const filename = basename(filePath);
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
      `stagedUploadsCreate failed for ${filename}: ${JSON.stringify(staged.stagedUploadsCreate.userErrors)}`,
    );
  }

  const form = new FormData();
  for (const param of target.parameters) {
    form.append(param.name, param.value);
  }
  form.append(
    'file',
    new Blob([readFileSync(filePath)], {type: mime}),
    filename,
  );

  const uploadRes = await fetch(target.url, {method: 'POST', body: form});
  if (!uploadRes.ok) {
    const body = await uploadRes.text();
    throw new Error(
      `Upload failed for ${filename}: ${uploadRes.status} ${body.slice(0, 200)}`,
    );
  }

  return target.resourceUrl;
}

async function createProduct(
  shop: string,
  token: string,
  product: ParsedProduct,
  media: Array<{originalSource: string; mediaContentType: string; alt: string}>,
): Promise<{id: string; handle: string; variantId: string; inventoryItemId: string}> {
  const data = await adminGraphql<{
    productCreate: {
      product: {
        id: string;
        handle: string;
        status: string;
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
    mutation CreateKaniProduct($product: ProductCreateInput!, $media: [CreateMediaInput!]) {
      productCreate(product: $product, media: $media) {
        product {
          id
          handle
          status
          variants(first: 1) {
            nodes { id inventoryItem { id } }
          }
        }
        userErrors { field message }
      }
    }`,
    {
      product: {
        title: product.title,
        handle: product.handle,
        descriptionHtml: product.descriptionHtml,
        productType: PRODUCT_TYPE,
        vendor: VENDOR,
        status: 'DRAFT',
        tags: product.tags,
        category: CATEGORY_ID,
        seo: {
          title: product.seoTitle,
          description: product.seoDescription,
        },
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
  const created = data.productCreate.product;
  if (!created?.id) throw new Error('productCreate returned no product');
  const variant = created.variants.nodes[0];
  if (!variant?.id) throw new Error('productCreate returned no variant');
  return {
    id: created.id,
    handle: created.handle,
    variantId: variant.id,
    inventoryItemId: variant.inventoryItem.id,
  };
}

async function setVariantPriceCostSku(
  shop: string,
  token: string,
  productId: string,
  variantId: string,
  product: ParsedProduct,
): Promise<void> {
  const data = await adminGraphql<{
    productVariantsBulkUpdate: {
      userErrors: Array<{field?: string[]; message: string}>;
    };
  }>(
    shop,
    token,
    `#graphql
    mutation UpdateVariantPrices($productId: ID!, $variants: [ProductVariantsBulkInput!]!) {
      productVariantsBulkUpdate(productId: $productId, variants: $variants) {
        userErrors { field message }
      }
    }`,
    {
      productId,
      variants: [
        {
          id: variantId,
          price: product.sellUsd,
          compareAtPrice: null,
          barcode: product.sku,
          inventoryItem: {
            sku: product.sku,
            tracked: true,
            cost: product.costUsd,
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

async function updateInventoryItemDetails(
  shop: string,
  token: string,
  inventoryItemId: string,
  costUsd: string,
): Promise<void> {
  const data = await adminGraphql<{
    inventoryItemUpdate: {userErrors: Array<{message: string}>};
  }>(
    shop,
    token,
    `#graphql
    mutation UpdateItem($id: ID!, $input: InventoryItemInput!) {
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

async function setInventoryQty(
  shop: string,
  token: string,
  inventoryItemId: string,
): Promise<void> {
  const data = await adminGraphql<{
    inventorySetQuantities: {
      userErrors: Array<{message: string; code?: string}>;
    };
  }>(
    shop,
    token,
    `#graphql
    mutation SetQty($input: InventorySetQuantitiesInput!) {
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
          {
            inventoryItemId,
            locationId: LOCATION_ID,
            quantity: 1,
          },
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

async function addToCollections(
  shop: string,
  token: string,
  collectionIds: string[],
  productId: string,
): Promise<void> {
  for (const collectionId of collectionIds) {
    const data = await adminGraphql<{
      collectionAddProducts: {userErrors: Array<{message: string}>};
    }>(
      shop,
      token,
      `#graphql
      mutation AddToCollection($id: ID!, $productIds: [ID!]!) {
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
    await sleep(200);
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
    mutation UpsertColorPattern($handle: MetaobjectHandleInput!, $metaobject: MetaobjectUpsertInput!) {
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
      `color-pattern ${label}: ${data.metaobjectUpsert.userErrors.map((e) => e.message).join('; ')}`,
    );
  }
  const id = data.metaobjectUpsert.metaobject?.id;
  if (!id) throw new Error(`color-pattern ${label}: no id`);
  colorPatternCache.set(label, id);
  return id;
}

async function setMetafields(
  shop: string,
  token: string,
  productGid: string,
  variantId: string,
  product: ParsedProduct,
  spec: FolderSpec,
  colorPatternIds: string[],
): Promise<void> {
  const story = `Handwoven Kani pashmina — ${spec.storyHint} — every thread carries the silence of the Changthang plateau, set in italic beneath the fold.`;
  const short = `A one-of-a-kind handwoven Kani cashmere pashmina with ${spec.storyHint}. Individually woven in Kashmir — subtle variations make every piece unique.`;

  const metafields: Array<{
    ownerId: string;
    namespace: string;
    key: string;
    type: string;
    value: string;
  }> = [
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
      value: JSON.stringify(
        spec.includeFloral
          ? [...colorPatternIds, FLORAL_METAOBJECT]
          : colorPatternIds,
      ),
    },
    {ownerId: variantId, namespace: 'mm-google-shopping', key: 'age_group', type: 'single_line_text_field', value: 'adult'},
    {ownerId: variantId, namespace: 'mm-google-shopping', key: 'condition', type: 'single_line_text_field', value: 'new'},
    {ownerId: variantId, namespace: 'mm-google-shopping', key: 'gender', type: 'single_line_text_field', value: 'unisex'},
    {ownerId: variantId, namespace: 'mm-google-shopping', key: 'mpn', type: 'single_line_text_field', value: product.sku},
    {ownerId: variantId, namespace: 'mm-google-shopping', key: 'color', type: 'single_line_text_field', value: spec.googleColor},
    {ownerId: variantId, namespace: 'global', key: 'harmonized_system_code', type: 'string', value: HS},
  ];

  for (let i = 0; i < metafields.length; i += 25) {
    const chunk = metafields.slice(i, i + 25);
    const data = await adminGraphql<{
      metafieldsSet: {
        userErrors: Array<{message: string; field?: string[]}>;
      };
    }>(
      shop,
      token,
      `#graphql
      mutation SetMetas($metafields: [MetafieldsSetInput!]!) {
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
    await sleep(200);
  }
}

async function confirm(
  shop: string,
  token: string,
  handle: string,
): Promise<Record<string, unknown>> {
  const data = await adminGraphql<{productByHandle: any}>(
    shop,
    token,
    `#graphql
    query($handle: String!) {
      productByHandle(handle: $handle) {
        id handle status title vendor productType
        category { name }
        collections(first: 5) { nodes { handle } }
        variants(first: 1) {
          nodes {
            sku barcode price compareAtPrice inventoryQuantity
            inventoryItem {
              tracked unitCost { amount }
              countryCodeOfOrigin harmonizedSystemCode
              measurement { weight { value unit } }
            }
          }
        }
      }
    }`,
    {handle},
  );
  return data.productByHandle;
}

async function main() {
  loadEnvFile();
  const dryRun = process.argv.includes('--dry-run');
  const shop = process.env.PUBLIC_STORE_DOMAIN ?? '70yuey-sr.myshopify.com';
  let token =
    process.env.SHOPIFY_ADMIN_ACCESS_TOKEN ??
    (existsSync('/tmp/shopify_admin_token.txt')
      ? readFileSync('/tmp/shopify_admin_token.txt', 'utf8').trim()
      : '');
  const cliToken = loadCliStoreToken(shop);
  if (cliToken) {
    // Prefer CLI token — .env shpat is often expired / app-not-installed
    token = cliToken;
    writeFileSync('/tmp/shopify_admin_token.txt', token);
  }
  if (!token) {
    console.error('No Admin API token available');
    process.exit(1);
  }

  console.log(`\nStore: ${shop}`);
  console.log(`Storefront: ${STOREFRONT}`);
  console.log(`Folders: ${FOLDERS.join(', ')}`);
  console.log(`FX: 1 USD = ${FX} INR | Sell = floor(2.5×cost / 10)×10`);
  console.log(`Status: DRAFT | Collections: ${COLLECTION_HANDLES.join(', ')}`);
  if (dryRun) console.log('DRY RUN — no writes\n');

  const products = FOLDERS.map(parseProductTxt);
  for (const p of products) {
    console.log(
      `  ${p.folder}: ${p.handle} | INR ${p.costInr} → cost $${p.costUsd} sell $${p.sellUsd} | ${p.imagePaths.length} images`,
    );
  }

  const collectionIds: string[] = [];
  for (const handle of COLLECTION_HANDLES) {
    const id = await findCollectionId(shop, token, handle);
    collectionIds.push(id);
    console.log(`  ✓ collection ${handle} → ${id}`);
  }

  const results: Array<Record<string, unknown>> = [];

  for (const product of products) {
    const spec = SPECS[product.folder];
    console.log(`\n── Folder ${product.folder}: ${product.handle}`);
    try {
      const existing = await findProductByHandle(shop, token, product.handle);
      if (existing) {
        console.log(`  · already exists (${existing.id}, ${existing.status}) — skip`);
        results.push({
          folder: product.folder,
          handle: product.handle,
          status: 'skipped',
          productId: existing.id,
          existingStatus: existing.status,
        });
        continue;
      }

      if (dryRun) {
        console.log(
          `  · would upload ${product.imagePaths.length} images, DRAFT @ $${product.sellUsd} cost $${product.costUsd}`,
        );
        results.push({
          folder: product.folder,
          handle: product.handle,
          status: 'dry-run',
          sellUsd: product.sellUsd,
          costUsd: product.costUsd,
          images: product.imagePaths.length,
        });
        continue;
      }

      const resourceUrls: string[] = [];
      for (const [i, filePath] of product.imagePaths.entries()) {
        process.stdout.write(
          `  staging ${i + 1}/${product.imagePaths.length} ${basename(filePath)}… `,
        );
        const url = await stageAndUpload(shop, token, filePath);
        resourceUrls.push(url);
        console.log('ok');
        await sleep(250);
      }

      const media = resourceUrls.map((originalSource, i) => ({
        originalSource,
        mediaContentType: 'IMAGE',
        alt: `${product.title} — image ${i + 1}`,
      }));

      process.stdout.write('  creating DRAFT product… ');
      const created = await createProduct(shop, token, product, media);
      console.log(created.id);

      process.stdout.write(
        `  price $${product.sellUsd} cost $${product.costUsd} sku ${product.sku}… `,
      );
      await setVariantPriceCostSku(
        shop,
        token,
        created.id,
        created.variantId,
        product,
      );
      console.log('ok');

      process.stdout.write('  inventory weight/HS/origin… ');
      await updateInventoryItemDetails(
        shop,
        token,
        created.inventoryItemId,
        product.costUsd,
      );
      console.log('ok');

      process.stdout.write('  qty=1… ');
      await setInventoryQty(shop, token, created.inventoryItemId);
      console.log('ok');

      process.stdout.write('  collections… ');
      await addToCollections(shop, token, collectionIds, created.id);
      console.log(COLLECTION_HANDLES.join(', '));

      process.stdout.write('  color patterns + metafields… ');
      const colorIds: string[] = [];
      for (const label of spec.colorLabels) {
        colorIds.push(await ensureColorPattern(shop, token, label));
      }
      await setMetafields(
        shop,
        token,
        created.id,
        created.variantId,
        product,
        spec,
        colorIds,
      );
      console.log('ok');

      const verified = await confirm(shop, token, created.handle);
      const numericId = created.id.split('/').pop() ?? '';
      const adminUrl = `https://${shop}/admin/products/${numericId}`;
      console.log(`  ✓ DRAFT verified: status=${verified.status}`);
      console.log(`  Admin: ${adminUrl}`);

      results.push({
        folder: product.folder,
        handle: created.handle,
        status: 'created',
        productId: created.id,
        adminUrl,
        storefrontUrl: `${STOREFRONT}/products/${created.handle}`,
        sellUsd: product.sellUsd,
        costUsd: product.costUsd,
        costInr: product.costInr,
        images: resourceUrls.length,
        verified,
      });

      await sleep(400);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(`  ✗ FAILED: ${message}`);
      results.push({
        folder: product.folder,
        handle: product.handle,
        status: 'failed',
        error: message,
      });
    }
  }

  console.log('\n========== SUMMARY ==========');
  console.log(JSON.stringify(results, null, 2));
  writeFileSync(
    resolve(dirname(fileURLToPath(import.meta.url)), '../kani-1-2-upload-results.json'),
    JSON.stringify(results, null, 2),
  );

  if (results.some((r) => r.status === 'failed')) process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
