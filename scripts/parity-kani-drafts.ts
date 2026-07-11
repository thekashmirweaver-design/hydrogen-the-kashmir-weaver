/**
 * Bring DRAFT Kani products to parity with live Kani heritage reference.
 *
 * - Price $2200, no compareAtPrice
 * - Unit cost $700, tracked=true, qty=1 at primary location
 * - Weight 220g, origin IN, HS 621420, barcode=SKU
 * - Category Scarves & Shawls (aa-2-26)
 * - Copy custom / Google / shopify taxonomy metafields (adapt color fields)
 * - Status stays DRAFT — does not publish
 *
 * Usage:
 *   npx tsx scripts/parity-kani-drafts.ts [--dry-run] [--handles a,b]
 */
import {existsSync, readFileSync, writeFileSync} from 'node:fs';
import {dirname, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

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
loadEnvFile();

const SHOP = process.env.PUBLIC_STORE_DOMAIN ?? '';
const TOKEN = process.env.SHOPIFY_ADMIN_ACCESS_TOKEN ?? '';
const API_VERSION = '2025-10';

const PRICE = '2200.00';
const UNIT_COST = '700.00';
const WEIGHT_GRAMS = 220;
const COUNTRY = 'IN';
const HS = '621420';
const CATEGORY_ID = 'gid://shopify/TaxonomyCategory/aa-2-26';
const LOCATION_ID = 'gid://shopify/Location/92787245271'; // Srinagar, India (primary)

const COLOR_PATTERN_TYPE = 'shopify--color-pattern';
const PATTERN_SOLID = 'gid://shopify/TaxonomyValue/2874';
const PATTERN_FLORAL = 'gid://shopify/TaxonomyValue/2871';

/** Existing floral pattern metaobject from live Kani */
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
  Navy: 'gid://shopify/TaxonomyValue/15',
  Orange: 'gid://shopify/TaxonomyValue/10',
  Pink: 'gid://shopify/TaxonomyValue/11',
  Purple: 'gid://shopify/TaxonomyValue/12',
  Red: 'gid://shopify/TaxonomyValue/13',
  Yellow: 'gid://shopify/TaxonomyValue/14',
};

/** Shared shopify.* taxonomy metafields copied from live heritage Kani */
const SHARED_SHOPIFY_METAFIELDS: Record<string, string[]> = {
  'accessory-size': ['gid://shopify/Metaobject/200385593559'], // Shawl
  fabric: [
    'gid://shopify/Metaobject/200509685975', // Cashmere
    'gid://shopify/Metaobject/201411526871', // Wool
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

type DraftSpec = {
  handle: string;
  productId: string; // numeric
  googleColor: string;
  colorLabels: string[]; // taxonomy color names for color-pattern
  includeFloral: boolean;
  storyHint: string;
};

const DRAFTS: DraftSpec[] = [
  {
    handle: 'mustard-golden-chinar-pallu-kani-cashmere-pashmina-shawl',
    productId: '9326380974295',
    googleColor: 'Mustard',
    colorLabels: ['Yellow', 'Gold'],
    includeFloral: true,
    storyHint: 'mustard-golden chinar pallu',
  },
  {
    handle: 'taupe-paisley-buta-kani-cashmere-pashmina-shawl',
    productId: '9326381072599',
    googleColor: 'Taupe',
    colorLabels: ['Brown', 'Beige'],
    includeFloral: false,
    storyHint: 'taupe paisley buta',
  },
  {
    handle: 'peach-lavender-floral-jaal-kani-cashmere-pashmina-shawl',
    productId: '9326381105367',
    googleColor: 'Peach',
    colorLabels: ['Pink', 'Purple'],
    includeFloral: true,
    storyHint: 'peach and lavender floral jaal',
  },
  {
    handle: 'earth-stripe-magenta-floral-buti-kani-cashmere-pashmina-shawl',
    productId: '9326381170903',
    googleColor: 'Multicolor',
    colorLabels: ['Brown', 'Pink', 'Multicolor'],
    includeFloral: true,
    storyHint: 'earth-stripe magenta floral buti',
  },
  {
    handle: 'royal-blue-floral-jaal-kani-cashmere-pashmina-shawl',
    productId: '9326381236439',
    googleColor: 'Blue',
    colorLabels: ['Blue'],
    includeFloral: true,
    storyHint: 'royal blue floral jaal',
  },
  {
    handle: 'mustard-medallion-border-kani-cashmere-pashmina-shawl',
    productId: '9326381269207',
    googleColor: 'Mustard',
    colorLabels: ['Yellow', 'Gold'],
    includeFloral: true,
    storyHint: 'mustard medallion border',
  },
  {
    handle: 'oatmeal-multicolor-floral-buti-kani-cashmere-pashmina-shawl',
    productId: '9326381334743',
    googleColor: 'Multicolor',
    colorLabels: ['Beige', 'Multicolor'],
    includeFloral: true,
    storyHint: 'oatmeal multicolor floral buti',
  },
  {
    handle: 'natural-beige-garden-floral-butti-kani-cashmere-pashmina-shawl',
    productId: '9326381596887',
    googleColor: 'Beige',
    colorLabels: ['Beige'],
    includeFloral: true,
    storyHint: 'natural beige garden floral butti',
  },
  {
    handle: 'cream-coffee-stripe-paisley-border-kani-cashmere-pashmina-shawl',
    productId: '9326382022871',
    googleColor: 'Cream',
    colorLabels: ['Beige', 'Brown'],
    includeFloral: false,
    storyHint: 'cream and coffee stripe paisley border',
  },
  {
    handle: 'saffron-floral-jaal-cypress-border-kani-cashmere-pashmina-shawl',
    productId: '9326383005911',
    googleColor: 'Saffron',
    colorLabels: ['Orange', 'Yellow'],
    includeFloral: true,
    storyHint: 'saffron floral jaal with cypress border',
  },
  {
    handle: 'olive-cream-stripe-turquoise-geometric-kani-cashmere-pashmina-shawl',
    productId: '9326383268055',
    googleColor: 'Multicolor',
    colorLabels: ['Green', 'Beige', 'Blue'],
    includeFloral: false,
    storyHint: 'olive-cream stripe with turquoise geometric motifs',
  },
  {
    handle: 'cream-olive-floral-medallion-kani-cashmere-pashmina-shawl',
    productId: '9326397915351',
    googleColor: 'Cream',
    colorLabels: ['Beige', 'Green', 'Brown'],
    includeFloral: true,
    storyHint: 'cream olive floral medallion jaal',
  },
];

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

type ConfirmRow = {
  handle: string;
  status: string;
  price: string | null;
  compareAt: string | null;
  cost: string | null;
  tracked: boolean | null;
  qty: number | null;
  weight: string | null;
  hs: string | null;
  origin: string | null;
  category: string | null;
  barcode: string | null;
  metafieldCounts: {custom: number; shopify: number; googleProduct: number; googleVariant: number};
  errors: string[];
};

if (!SHOP || !TOKEN) {
  console.error('Missing PUBLIC_STORE_DOMAIN or SHOPIFY_ADMIN_ACCESS_TOKEN');
  process.exit(1);
}

async function adminGraphql<T>(
  query: string,
  variables?: Record<string, unknown>,
  attempt = 0,
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
  const json = (await res.json()) as {
    data?: T;
    errors?: Array<{message: string}>;
  };
  if (json.errors?.length) {
    const msg = json.errors.map((e) => e.message).join('; ');
    if (/throttl|rate|TIMEOUT/i.test(msg) && attempt < 5) {
      await sleep(2000 * (attempt + 1));
      return adminGraphql(query, variables, attempt + 1);
    }
    throw new Error(msg);
  }
  if (!json.data) throw new Error('GraphQL response missing data');
  return json.data;
}

function colorPatternHandle(label: string): string {
  return `${label.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-solid`;
}

const colorPatternCache = new Map<string, string>();

async function ensureColorPattern(label: string): Promise<string> {
  if (colorPatternCache.has(label)) return colorPatternCache.get(label)!;
  const taxonomyGid = TAXONOMY_COLORS[label];
  if (!taxonomyGid) throw new Error(`No taxonomy color for ${label}`);

  const data = await adminGraphql<{
    metaobjectUpsert: {
      metaobject: {id: string; displayName: string} | null;
      userErrors: Array<{message: string}>;
    };
  }>(
    `#graphql
    mutation UpsertColorPattern($handle: MetaobjectHandleInput!, $metaobject: MetaobjectUpsertInput!) {
      metaobjectUpsert(handle: $handle, metaobject: $metaobject) {
        metaobject { id displayName }
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
  if (!id) throw new Error(`color-pattern ${label}: no id returned`);
  colorPatternCache.set(label, id);
  return id;
}

async function setCategory(productGid: string): Promise<void> {
  const data = await adminGraphql<{
    productUpdate: {userErrors: Array<{message: string}>};
  }>(
    `#graphql
    mutation SetCategory($product: ProductUpdateInput!) {
      productUpdate(product: $product) {
        userErrors { field message }
      }
    }`,
    {product: {id: productGid, category: CATEGORY_ID}},
  );
  if (data.productUpdate.userErrors.length) {
    throw new Error(data.productUpdate.userErrors.map((e) => e.message).join('; '));
  }
}

async function updateVariantBasics(
  productGid: string,
  variantId: string,
  sku: string,
): Promise<void> {
  const data = await adminGraphql<{
    productVariantsBulkUpdate: {
      userErrors: Array<{message: string}>;
    };
  }>(
    `#graphql
    mutation UpdateVariant($productId: ID!, $variants: [ProductVariantsBulkInput!]!) {
      productVariantsBulkUpdate(productId: $productId, variants: $variants) {
        userErrors { field message }
      }
    }`,
    {
      productId: productGid,
      variants: [
        {
          id: variantId,
          price: PRICE,
          // Explicitly clear compare-at if any
          compareAtPrice: null,
          barcode: sku,
          inventoryItem: {
            sku,
            tracked: true,
            cost: UNIT_COST,
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

async function updateInventoryItemDetails(inventoryItemId: string): Promise<void> {
  const data = await adminGraphql<{
    inventoryItemUpdate: {
      userErrors: Array<{message: string}>;
    };
  }>(
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
        cost: UNIT_COST,
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

async function setInventoryQty(inventoryItemId: string): Promise<void> {
  const data = await adminGraphql<{
    inventorySetQuantities: {
      userErrors: Array<{message: string; code?: string}>;
    };
  }>(
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

function buildStory(hint: string): string {
  return `Handwoven Kani pashmina — ${hint} — every thread carries the silence of the Changthang plateau, set in italic beneath the fold.`;
}

function buildShortDescription(hint: string): string {
  return `A one-of-a-kind handwoven Kani cashmere pashmina with ${hint}. Individually woven in Kashmir — subtle variations make every piece unique.`;
}

async function setMetafields(
  productGid: string,
  variantId: string,
  sku: string,
  spec: DraftSpec,
  colorPatternIds: string[],
): Promise<void> {
  const metafields: Array<{
    ownerId: string;
    namespace: string;
    key: string;
    type: string;
    value: string;
  }> = [
    // custom.*
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
    {ownerId: productGid, namespace: 'custom', key: 'story', type: 'multi_line_text_field', value: buildStory(spec.storyHint)},
    {ownerId: productGid, namespace: 'custom', key: 'short_description', type: 'single_line_text_field', value: buildShortDescription(spec.storyHint)},
    // Google product-level
    {ownerId: productGid, namespace: 'mm-google-shopping', key: 'age_group', type: 'single_line_text_field', value: 'adult'},
    {ownerId: productGid, namespace: 'mm-google-shopping', key: 'condition', type: 'single_line_text_field', value: 'new'},
    {ownerId: productGid, namespace: 'mm-google-shopping', key: 'gender', type: 'single_line_text_field', value: 'unisex'},
    // shopify taxonomy (shared)
    ...Object.entries(SHARED_SHOPIFY_METAFIELDS).map(([key, ids]) => ({
      ownerId: productGid,
      namespace: 'shopify',
      key,
      type: 'list.metaobject_reference',
      value: JSON.stringify(ids),
    })),
    // color-pattern (adapted)
    {
      ownerId: productGid,
      namespace: 'shopify',
      key: 'color-pattern',
      type: 'list.metaobject_reference',
      value: JSON.stringify(colorPatternIds),
    },
    // Google + HS on variant
    {ownerId: variantId, namespace: 'mm-google-shopping', key: 'age_group', type: 'single_line_text_field', value: 'adult'},
    {ownerId: variantId, namespace: 'mm-google-shopping', key: 'condition', type: 'single_line_text_field', value: 'new'},
    {ownerId: variantId, namespace: 'mm-google-shopping', key: 'gender', type: 'single_line_text_field', value: 'unisex'},
    {ownerId: variantId, namespace: 'mm-google-shopping', key: 'mpn', type: 'single_line_text_field', value: sku},
    {ownerId: variantId, namespace: 'mm-google-shopping', key: 'color', type: 'single_line_text_field', value: spec.googleColor},
    {ownerId: variantId, namespace: 'global', key: 'harmonized_system_code', type: 'string', value: HS},
  ];

  // metafieldsSet max 25 per call
  for (let i = 0; i < metafields.length; i += 25) {
    const chunk = metafields.slice(i, i + 25);
    const data = await adminGraphql<{
      metafieldsSet: {
        metafields: Array<{id: string}> | null;
        userErrors: Array<{message: string; field?: string[]}>;
      };
    }>(
      `#graphql
      mutation SetMetas($metafields: [MetafieldsSetInput!]!) {
        metafieldsSet(metafields: $metafields) {
          metafields { id }
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

async function fetchConfirm(handle: string): Promise<ConfirmRow> {
  const data = await adminGraphql<{productByHandle: any}>(
    `#graphql
    query($handle: String!) {
      productByHandle(handle: $handle) {
        id handle status
        category { id name }
        metafields(first: 50) { nodes { namespace key } }
        variants(first: 1) {
          nodes {
            sku barcode price compareAtPrice
            inventoryQuantity
            metafields(first: 20) { nodes { namespace key } }
            inventoryItem {
              tracked
              unitCost { amount }
              countryCodeOfOrigin
              harmonizedSystemCode
              measurement { weight { value unit } }
              inventoryLevels(first: 3) {
                nodes {
                  location { id }
                  quantities(names: ["available"]) { name quantity }
                }
              }
            }
          }
        }
      }
    }`,
    {handle},
  );
  const p = data.productByHandle;
  const v = p?.variants?.nodes?.[0];
  const inv = v?.inventoryItem;
  const qtyNode = inv?.inventoryLevels?.nodes?.find(
    (n: any) => n.location.id === LOCATION_ID,
  );
  const qty =
    qtyNode?.quantities?.find((q: any) => q.name === 'available')?.quantity ??
    v?.inventoryQuantity ??
    null;

  const mfs = p?.metafields?.nodes ?? [];
  const vmfs = v?.metafields?.nodes ?? [];

  return {
    handle,
    status: p?.status ?? 'MISSING',
    price: v?.price ?? null,
    compareAt: v?.compareAtPrice ?? null,
    cost: inv?.unitCost?.amount ?? null,
    tracked: inv?.tracked ?? null,
    qty,
    weight: inv?.measurement?.weight
      ? `${inv.measurement.weight.value} ${inv.measurement.weight.unit}`
      : null,
    hs: inv?.harmonizedSystemCode ?? null,
    origin: inv?.countryCodeOfOrigin ?? null,
    category: p?.category?.name ?? null,
    barcode: v?.barcode ?? null,
    metafieldCounts: {
      custom: mfs.filter((m: any) => m.namespace === 'custom').length,
      shopify: mfs.filter((m: any) => m.namespace === 'shopify').length,
      googleProduct: mfs.filter((m: any) => m.namespace === 'mm-google-shopping')
        .length,
      googleVariant: vmfs.filter(
        (m: any) => m.namespace === 'mm-google-shopping',
      ).length,
    },
    errors: [],
  };
}

function parseArgs(argv: string[]) {
  const dryRun = argv.includes('--dry-run');
  let handles: string[] | null = null;
  const idx = argv.indexOf('--handles');
  if (idx !== -1 && argv[idx + 1]) {
    handles = argv[idx + 1].split(',').map((s) => s.trim()).filter(Boolean);
  }
  return {dryRun, handles};
}

async function main() {
  const {dryRun, handles} = parseArgs(process.argv.slice(2));
  const targets = handles
    ? DRAFTS.filter((d) => handles.includes(d.handle))
    : DRAFTS;

  console.log(`\nStore: ${SHOP}`);
  console.log(`Drafts: ${targets.length}`);
  console.log(
    `Price $${PRICE} | cost $${UNIT_COST} | weight ${WEIGHT_GRAMS}g | HS ${HS} | qty 1 @ ${LOCATION_ID}`,
  );
  console.log(`Status: keep DRAFT | compareAt: null`);
  if (dryRun) console.log('DRY RUN — no writes\n');

  const results: ConfirmRow[] = [];

  for (const spec of targets) {
    console.log(`\n── ${spec.handle}`);
    const productGid = `gid://shopify/Product/${spec.productId}`;
    const errors: string[] = [];

    try {
      // Resolve product/variant
      const existing = await adminGraphql<{productByHandle: any}>(
        `#graphql
        query($handle: String!) {
          productByHandle(handle: $handle) {
            id handle status
            variants(first: 1) {
              nodes {
                id sku
                inventoryItem { id }
              }
            }
          }
        }`,
        {handle: spec.handle},
      );
      const product = existing.productByHandle;
      if (!product) throw new Error('Product not found');
      if (product.status !== 'DRAFT') {
        throw new Error(`Refusing to update non-DRAFT status=${product.status}`);
      }
      if (product.id !== productGid) {
        console.log(`  · id mismatch expected ${productGid} got ${product.id} — using live id`);
      }
      const variant = product.variants.nodes[0];
      if (!variant) throw new Error('No variant');
      const sku = variant.sku;
      if (!sku) throw new Error('Variant has no SKU');
      console.log(`  · ${product.id} status=${product.status} sku=${sku}`);

      // Color-pattern metaobjects
      const colorPatternIds: string[] = [];
      for (const label of spec.colorLabels) {
        const id = await ensureColorPattern(label);
        if (!colorPatternIds.includes(id)) colorPatternIds.push(id);
        await sleep(150);
      }
      if (spec.includeFloral && !colorPatternIds.includes(FLORAL_METAOBJECT)) {
        colorPatternIds.push(FLORAL_METAOBJECT);
      }
      console.log(`  · color-pattern ids: ${colorPatternIds.length}`);

      if (dryRun) {
        console.log('  · dry-run skip writes');
        const confirm = await fetchConfirm(spec.handle);
        confirm.errors.push('dry-run');
        results.push(confirm);
        continue;
      }

      process.stdout.write('  category… ');
      await setCategory(product.id);
      console.log('ok');

      process.stdout.write('  variant price/barcode/tracked/cost… ');
      await updateVariantBasics(product.id, variant.id, sku);
      console.log('ok');
      await sleep(200);

      process.stdout.write('  inventory item weight/HS/origin/cost… ');
      await updateInventoryItemDetails(variant.inventoryItem.id);
      console.log('ok');
      await sleep(200);

      process.stdout.write('  inventory qty=1… ');
      await setInventoryQty(variant.inventoryItem.id);
      console.log('ok');
      await sleep(200);

      process.stdout.write('  metafields… ');
      await setMetafields(product.id, variant.id, sku, spec, colorPatternIds);
      console.log('ok');

      // Verify still DRAFT
      const confirm = await fetchConfirm(spec.handle);
      if (confirm.status !== 'DRAFT') {
        confirm.errors.push(`status became ${confirm.status}`);
      }
      if (confirm.compareAt != null) {
        confirm.errors.push(`compareAt still set: ${confirm.compareAt}`);
      }
      results.push(confirm);
      console.log(
        `  ✓ price=${confirm.price} cost=${confirm.cost} compare=${confirm.compareAt} tracked=${confirm.tracked} qty=${confirm.qty} weight=${confirm.weight} hs=${confirm.hs} origin=${confirm.origin} cat=${confirm.category} barcode=${confirm.barcode} mfs custom=${confirm.metafieldCounts.custom} shopify=${confirm.metafieldCounts.shopify} gProd=${confirm.metafieldCounts.googleProduct} gVar=${confirm.metafieldCounts.googleVariant}`,
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(`  ✗ ${message}`);
      errors.push(message);
      try {
        const confirm = await fetchConfirm(spec.handle);
        confirm.errors = errors;
        results.push(confirm);
      } catch {
        results.push({
          handle: spec.handle,
          status: 'ERROR',
          price: null,
          compareAt: null,
          cost: null,
          tracked: null,
          qty: null,
          weight: null,
          hs: null,
          origin: null,
          category: null,
          barcode: null,
          metafieldCounts: {custom: 0, shopify: 0, googleProduct: 0, googleVariant: 0},
          errors,
        });
      }
    }
    await sleep(300);
  }

  console.log('\n========== CONFIRMATION ==========');
  console.log(
    'handle\tstatus\tprice\tcost\tcompare\ttracked\tqty\tweight\ths\torigin\tcategory\tbarcode\tcustom\tshopify\tgProd\tgVar\terrors',
  );
  for (const r of results) {
    console.log(
      [
        r.handle,
        r.status,
        r.price,
        r.cost,
        r.compareAt ?? 'null',
        r.tracked,
        r.qty,
        r.weight,
        r.hs,
        r.origin,
        r.category,
        r.barcode,
        r.metafieldCounts.custom,
        r.metafieldCounts.shopify,
        r.metafieldCounts.googleProduct,
        r.metafieldCounts.googleVariant,
        r.errors.join('|') || '-',
      ].join('\t'),
    );
  }

  const outPath = resolve(
    dirname(fileURLToPath(import.meta.url)),
    'parity-kani-drafts-results.json',
  );
  writeFileSync(outPath, JSON.stringify(results, null, 2));
  console.log(`\nWrote ${outPath}`);

  const failed = results.filter((r) => r.errors.length > 0 || r.status !== 'DRAFT');
  if (failed.length && !dryRun) process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
