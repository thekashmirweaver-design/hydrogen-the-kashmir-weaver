/**
 * Upload Kani draft products from local product.txt + image folders.
 *
 * Usage:
 *   npx tsx scripts/upload-kani-draft-products.ts [--dry-run] [--folders 3,4,5]
 *
 * Requires SHOPIFY_ADMIN_ACCESS_TOKEN + PUBLIC_STORE_DOMAIN in .env.
 */
import {existsSync, readFileSync, readdirSync, statSync} from 'node:fs';
import {basename, extname, join, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

const API_VERSION = '2025-10';
const PRICE = '2200.00';
const BASE_DIR =
  '/Users/iambqc/Downloads/THE KASHMIR WEAVER/PRODUCTS/GENERATED/MUDASIR/KANI';
const DEFAULT_FOLDERS = [3, 4, 5, 6, 7, 8, 9, 10, 12, 13, 14, 15];
const COLLECTION_HANDLES = ['kani', 'homepage-featured'] as const;
const VENDOR = 'The Kashmir Weaver';
const PRODUCT_TYPE = 'Kani';

type ParsedProduct = {
  folder: number;
  title: string;
  handle: string;
  seoTitle: string;
  seoDescription: string;
  tags: string[];
  sku: string;
  descriptionHtml: string;
  imageNames: string[];
  imagePaths: string[];
};

type ResultRow = {
  folder: number;
  handle: string;
  productId: string;
  adminUrl: string;
  storefrontUrl: string;
  imageCount: number;
  status: 'created' | 'skipped' | 'failed';
  error?: string;
};

function loadEnvFile() {
  const root = resolve(fileURLToPath(new URL('.', import.meta.url)), '..');
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
  const sku = skuMatch?.[1] ?? `TKW-KANI-${100 + folder}-M`;

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
  const descriptionHtml = descMatch[1].trim();

  return {
    folder,
    title,
    handle,
    seoTitle,
    seoDescription,
    tags,
    sku,
    descriptionHtml,
    imageNames,
    imagePaths,
  };
}

async function adminGraphql<T>(
  shop: string,
  token: string,
  query: string,
  variables?: Record<string, unknown>,
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
    throw new Error(json.errors.map((e) => e.message).join('; '));
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
  form.append('file', new Blob([readFileSync(filePath)], {type: mime}), filename);

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
): Promise<{id: string; handle: string; variantId: string}> {
  const data = await adminGraphql<{
    productCreate: {
      product: {
        id: string;
        handle: string;
        status: string;
        variants: {nodes: Array<{id: string}>};
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
          variants(first: 1) { nodes { id } }
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
  const variantId = created.variants.nodes[0]?.id;
  if (!variantId) throw new Error('productCreate returned no variant');
  return {id: created.id, handle: created.handle, variantId};
}

async function setVariantPriceAndSku(
  shop: string,
  token: string,
  productId: string,
  variantId: string,
  sku: string,
): Promise<void> {
  const data = await adminGraphql<{
    productVariantsBulkUpdate: {
      productVariants: Array<{id: string; price: string; sku: string}> | null;
      userErrors: Array<{field?: string[]; message: string}>;
    };
  }>(
    shop,
    token,
    `#graphql
    mutation UpdateVariantPrices($productId: ID!, $variants: [ProductVariantsBulkInput!]!) {
      productVariantsBulkUpdate(productId: $productId, variants: $variants) {
        productVariants { id price sku }
        userErrors { field message }
      }
    }`,
    {
      productId,
      variants: [
        {
          id: variantId,
          price: PRICE,
          inventoryItem: {sku},
        },
      ],
    },
  );

  if (data.productVariantsBulkUpdate.userErrors.length) {
    throw new Error(
      data.productVariantsBulkUpdate.userErrors
        .map((e) => e.message)
        .join('; '),
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
      collectionAddProducts: {
        userErrors: Array<{message: string}>;
      };
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

function parseArgs(argv: string[]) {
  const dryRun = argv.includes('--dry-run');
  let folders = DEFAULT_FOLDERS;
  const foldersIdx = argv.indexOf('--folders');
  if (foldersIdx !== -1 && argv[foldersIdx + 1]) {
    folders = argv[foldersIdx + 1].split(',').map((s) => Number(s.trim()));
  }
  return {dryRun, folders};
}

async function main() {
  loadEnvFile();
  const {dryRun, folders} = parseArgs(process.argv.slice(2));
  const shop = process.env.PUBLIC_STORE_DOMAIN ?? '';
  const token = process.env.SHOPIFY_ADMIN_ACCESS_TOKEN ?? '';
  const storeUrl = (process.env.PUBLIC_STORE_URL ?? `https://${shop}`).replace(
    /\/$/,
    '',
  );

  if (!shop || !token) {
    console.error('Missing PUBLIC_STORE_DOMAIN or SHOPIFY_ADMIN_ACCESS_TOKEN');
    process.exit(1);
  }

  console.log(`\nStore: ${shop}`);
  console.log(`Folders: ${folders.join(', ')}`);
  console.log(`Price: $${PRICE} USD | Status: DRAFT`);
  console.log(`Collections: ${COLLECTION_HANDLES.join(', ')}`);
  if (dryRun) console.log('DRY RUN — no writes\n');

  const products = folders.map(parseProductTxt);
  console.log(`\nParsed ${products.length} products:`);
  for (const p of products) {
    console.log(`  ${p.folder}: ${p.handle} (${p.imagePaths.length} images)`);
  }

  const collectionIds: string[] = [];
  for (const handle of COLLECTION_HANDLES) {
    const id = await findCollectionId(shop, token, handle);
    collectionIds.push(id);
    console.log(`  ✓ collection ${handle} → ${id}`);
  }

  const results: ResultRow[] = [];

  for (const product of products) {
    console.log(`\n── Folder ${product.folder}: ${product.handle}`);
    try {
      const existing = await findProductByHandle(shop, token, product.handle);
      if (existing) {
        console.log(`  · already exists (${existing.id}) — skipping create`);
        const numericId = existing.id.split('/').pop() ?? '';
        results.push({
          folder: product.folder,
          handle: product.handle,
          productId: existing.id,
          adminUrl: `https://${shop}/admin/products/${numericId}`,
          storefrontUrl: `${storeUrl}/products/${product.handle}`,
          imageCount: 0,
          status: 'skipped',
          error: 'handle already exists',
        });
        continue;
      }

      if (dryRun) {
        console.log(`  · would upload ${product.imagePaths.length} images`);
        console.log(`  · would create DRAFT @ $${PRICE} sku=${product.sku}`);
        results.push({
          folder: product.folder,
          handle: product.handle,
          productId: '(dry-run)',
          adminUrl: '',
          storefrontUrl: `${storeUrl}/products/${product.handle}`,
          imageCount: product.imagePaths.length,
          status: 'created',
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

      process.stdout.write('  creating product… ');
      const created = await createProduct(shop, token, product, media);
      console.log(`${created.id}`);

      process.stdout.write(`  setting price $${PRICE} + sku ${product.sku}… `);
      await setVariantPriceAndSku(
        shop,
        token,
        created.id,
        created.variantId,
        product.sku,
      );
      console.log('ok');

      process.stdout.write('  adding to collections… ');
      await addToCollections(shop, token, collectionIds, created.id);
      console.log(COLLECTION_HANDLES.join(', '));

      const numericId = created.id.split('/').pop() ?? '';
      results.push({
        folder: product.folder,
        handle: created.handle,
        productId: created.id,
        adminUrl: `https://${shop}/admin/products/${numericId}`,
        storefrontUrl: `${storeUrl}/products/${created.handle}`,
        imageCount: resourceUrls.length,
        status: 'created',
      });

      await sleep(400);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(`  ✗ FAILED: ${message}`);
      results.push({
        folder: product.folder,
        handle: product.handle,
        productId: '',
        adminUrl: '',
        storefrontUrl: `${storeUrl}/products/${product.handle}`,
        imageCount: 0,
        status: 'failed',
        error: message,
      });
    }
  }

  console.log('\n========== SUMMARY ==========');
  console.log(
    'folder\thandle\tproduct_id\timages\tstatus\tadmin_url\tstorefront_url',
  );
  for (const r of results) {
    console.log(
      [
        r.folder,
        r.handle,
        r.productId || '-',
        r.imageCount,
        r.status + (r.error ? ` (${r.error})` : ''),
        r.adminUrl || '-',
        r.storefrontUrl,
      ].join('\t'),
    );
  }

  const created = results.filter((r) => r.status === 'created').length;
  const skipped = results.filter((r) => r.status === 'skipped').length;
  const failed = results.filter((r) => r.status === 'failed').length;
  console.log(
    `\nDone. created=${created} skipped=${skipped} failed=${failed}\n`,
  );

  // Machine-readable dump for the parent agent
  console.log('__JSON_RESULTS__');
  console.log(JSON.stringify(results, null, 2));

  if (failed > 0) process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
