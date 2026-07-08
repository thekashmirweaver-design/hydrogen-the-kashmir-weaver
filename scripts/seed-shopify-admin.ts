/**
 * Seeds Shopify Admin from the static catalog in app/models/static/.
 *
 * Requires (from .env or shell env):
 *   PUBLIC_STORE_DOMAIN or SHOPIFY_STORE_DOMAIN  (e.g. your-store.myshopify.com)
 *   SHOPIFY_ADMIN_ACCESS_TOKEN                   (Admin API access token)
 *   PUBLIC_STORE_URL                               (deployed URL for /assets images)
 *
 * Run: npm run seed:shopify
 */
import {existsSync, readFileSync} from 'node:fs';
import {dirname, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {products, collections} from '../app/models/static/repository.ts';
import {POSTS, ARTICLES} from '../app/models/static/journal.ts';
import {CONTACT} from '../app/lib/contact.ts';
import {
  buildSizeOnlyVariants,
  shopifySizeProductOptions,
} from '../app/models/store-sizes.ts';
import type {Product} from '../app/models/types.ts';
import {
  DEFAULT_FEATURED_COLLECTION_HANDLE,
  FEATURED_COLLECTION_TITLE,
} from '../app/lib/featured-collection.ts';

/** Load repo-root .env into process.env (does not override existing vars). */
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
const BASE_URL = (process.env.PUBLIC_STORE_URL ?? '').replace(/\/$/, '');
const API_VERSION = '2025-01';

if (!SHOP || !TOKEN || !BASE_URL) {
  console.error(
    'Missing env: PUBLIC_STORE_DOMAIN, SHOPIFY_ADMIN_ACCESS_TOKEN, PUBLIC_STORE_URL',
  );
  process.exit(1);
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function adminRest<T>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  const res = await fetch(`https://${SHOP}/admin/api/${API_VERSION}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      'X-Shopify-Access-Token': TOKEN,
      ...(init?.headers ?? {}),
    },
  });
  if (!res.ok) {
    throw new Error(`Admin REST ${res.status}: ${await res.text()}`);
  }
  return res.json() as Promise<T>;
}

/** Products/collections are created unpublished; Storefront API needs published: true. */
async function publishCatalogToStorefront() {
  const productsRes = await adminRest<{
    products: Array<{id: number; handle: string; published_at: string | null}>;
  }>('/products.json?limit=250&fields=id,handle,published_at');

  let publishedProducts = 0;
  for (const product of productsRes.products) {
    if (product.published_at) continue;
    await adminRest(`/products/${product.id}.json`, {
      method: 'PUT',
      body: JSON.stringify({product: {id: product.id, published: true}}),
    });
    publishedProducts++;
    await sleep(200);
  }

  const collectionsRes = await adminRest<{
    custom_collections: Array<{
      id: number;
      handle: string;
      published_at: string | null;
    }>;
  }>('/custom_collections.json?limit=50');

  let publishedCollections = 0;
  for (const collection of collectionsRes.custom_collections ?? []) {
    if (collection.published_at) continue;
    await adminRest(`/custom_collections/${collection.id}.json`, {
      method: 'PUT',
      body: JSON.stringify({
        custom_collection: {id: collection.id, published: true},
      }),
    });
    publishedCollections++;
    await sleep(200);
  }

  console.log(
    `  ✓ Online Store: ${publishedProducts} products, ${publishedCollections} collections`,
  );

  try {
    await publishToHeadlessChannel();
  } catch (err) {
    console.log(
      `  · Headless channel: ${(err as Error).message}`,
    );
    console.log(
      '    Re-run `shopify store auth` (needs write_publications), then `npm run publish:headless`.',
    );
  }
}

/** Publish catalog to Hydrogen headless channel via publishablePublish. */
async function publishToHeadlessChannel() {
  const data = await adminGraphql<{
    catalogs: {nodes: Array<{id: string; title: string}>};
  }>(`query { catalogs(first: 20) { nodes { id title } } }`);

  const match = data.catalogs.nodes.find((c) =>
    c.title.includes('The Kashmir Weaver'),
  );
  if (!match) throw new Error('Hydrogen AppCatalog not found');

  const publicationId = `gid://shopify/Publication/${match.id.split('/').pop()}`;

  const products = await adminGraphql<{
    products: {nodes: Array<{id: string; handle: string}>};
  }>(`query { products(first: 250) { nodes { id handle } } }`);

  let count = 0;
  for (const product of products.products.nodes) {
    const result = await adminGraphql<{
      publishablePublish: {userErrors: Array<{message: string}>};
    }>(
      `mutation($id:ID!,$input:[PublicationInput!]!){
        publishablePublish(id:$id,input:$input){ userErrors { message } }
      }`,
      {id: product.id, input: [{publicationId}]},
    );
    if (!result.publishablePublish.userErrors.length) count++;
    await sleep(150);
  }

  console.log(`  ✓ Headless channel: ${count} products`);
}

/** Scopes required for each seed phase. Shop metafields need fewer scopes than catalog. */
const REQUIRED_SCOPES = {
  catalog: ['write_products', 'read_products', 'write_content', 'read_content'],
} as const;

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

async function checkAccessScopes(): Promise<Set<string>> {
  try {
    const data = await adminGraphql<{
      currentAppInstallation: {accessScopes: Array<{handle: string}>};
    }>(`query { currentAppInstallation { accessScopes { handle } } }`);

    return new Set(data.currentAppInstallation.accessScopes.map((s) => s.handle));
  } catch (err) {
    const message = (err as Error).message;
    if (/access.?denied/i.test(message)) {
      console.warn(
        '\n⚠ Cannot read app scopes (ACCESS_DENIED on currentAppInstallation).',
      );
      console.warn(
        '  Custom Admin app tokens often lack this query; assuming catalog scopes are missing.',
      );
      console.warn(
        '  Continuing with shop metafields. Grant write_products + write_content, then re-run.\n',
      );
      return new Set<string>();
    }
    throw err;
  }
}

function warnMissingScopes(scopes: Set<string>) {
  const missing = REQUIRED_SCOPES.catalog.filter((s) => !scopes.has(s));
  if (missing.length === 0) return;

  console.warn(
    `\n⚠ Missing Admin API scopes: ${missing.join(', ')}`,
  );
  console.warn(
    '  Products, collections, and journal articles will be skipped until you grant scopes.',
  );
  console.warn('  Option A — Custom Admin app:');
  console.warn(
    '    Admin → Settings → Apps → Develop apps → [your app] → Configuration',
  );
  console.warn(
    '    → enable write_products, write_content (and read_*) → Install → copy token',
  );
  console.warn('  Option B — Partner app (shopify.app.toml in this repo):');
  console.warn('    npx shopify app deploy → install on store → copy Admin API token');
  console.warn('  Set SHOPIFY_ADMIN_ACCESS_TOKEN in .env and re-run npm run seed:shopify\n');
}

function assetUrl(path: string): string {
  if (path.startsWith('http')) return path;
  return `${BASE_URL}${path.startsWith('/') ? path : `/${path}`}`;
}

async function getShopId(): Promise<string> {
  const data = await adminGraphql<{shop: {id: string}}>(
    `query { shop { id } }`,
  );
  return data.shop.id;
}

async function ensureMetafieldDefinitions() {
  const definitions = [
    {key: 'story', name: 'Story', type: 'multi_line_text_field', owner: 'PRODUCT'},
    {key: 'short_description', name: 'Short description', type: 'single_line_text_field', owner: 'PRODUCT'},
    {key: 'material', name: 'Material', type: 'single_line_text_field', owner: 'PRODUCT'},
    {key: 'origin', name: 'Origin', type: 'single_line_text_field', owner: 'PRODUCT'},
    {key: 'weave', name: 'Weave', type: 'single_line_text_field', owner: 'PRODUCT'},
    {key: 'limited', name: 'Limited edition', type: 'boolean', owner: 'PRODUCT'},
    {key: 'stock_qty', name: 'Stock quantity', type: 'number_integer', owner: 'PRODUCT'},
    {key: 'show_colour_studio', name: 'Show colour studio', type: 'boolean', owner: 'PRODUCT'},
    {key: 'care', name: 'Care instructions', type: 'single_line_text_field', owner: 'PRODUCT'},
    {key: 'guarantees_delivery', name: 'Guarantees and delivery', type: 'json', owner: 'PRODUCT'},
    {key: 'returns_care', name: 'Returns and care', type: 'json', owner: 'PRODUCT'},
    {key: 'tagline', name: 'Tagline', type: 'single_line_text_field', owner: 'COLLECTION'},
    {key: 'story', name: 'Story', type: 'multi_line_text_field', owner: 'COLLECTION'},
    {key: 'marquee_messages', name: 'Marquee messages', type: 'json', owner: 'SHOP'},
    {key: 'homepage_featured', name: 'Homepage featured', type: 'json', owner: 'SHOP'},
    {key: 'contact', name: 'Contact', type: 'json', owner: 'SHOP'},
    {key: 'social', name: 'Social', type: 'json', owner: 'SHOP'},
  ] as const;

  for (const def of definitions) {
    try {
      await adminGraphql(
        `#graphql
        mutation CreateMetafieldDefinition($definition: MetafieldDefinitionInput!) {
          metafieldDefinitionCreate(definition: $definition) {
            createdDefinition { id }
            userErrors { message field }
          }
        }`,
        {
          definition: {
            namespace: 'custom',
            key: def.key,
            name: def.name,
            type: def.type,
            ownerType: def.owner,
            access: {storefront: 'PUBLIC_READ'},
          },
        },
      );
      console.log(`  ✓ metafield definition custom.${def.key} (${def.owner})`);
    } catch (err) {
      console.log(`  · custom.${def.key} (${def.owner}): ${(err as Error).message}`);
    }
    await sleep(300);
  }
}

async function setShopMetafields(shopId: string) {
  const collectionHandles = collections.map((c) => c.handle);

  const metafields = [
    {
      namespace: 'custom',
      key: 'marquee_messages',
      type: 'json',
      value: JSON.stringify([
        'Authentic Kashmiri Pashmina',
        'Handcrafted by Artisans',
        'Free Worldwide Shipping Over $200',
        'Certificate of Authenticity Included',
      ]),
    },
    {
      namespace: 'custom',
      key: 'homepage_featured',
      type: 'json',
      value: JSON.stringify({
        featuredCollectionHandle: DEFAULT_FEATURED_COLLECTION_HANDLE,
        collectionHandles: collectionHandles.slice(0, 4),
        featuredCount: 8,
        collectionCount: 4,
        collectionPreviewCount: 3,
        bestSellingCount: 8,
        newestCount: 8,
        heroImageUrl: assetUrl('/assets/hero-portrait.jpg'),
        heroAlt:
          'A woman wrapped in an emerald pashmina shawl, framed by a stone arch overlooking a Himalayan lake at dusk.',
      }),
    },
    {
      namespace: 'custom',
      key: 'contact',
      type: 'json',
      value: JSON.stringify({
        email: CONTACT.email,
        phone: CONTACT.phone,
        whatsapp: CONTACT.whatsapp,
      }),
    },
    {
      namespace: 'custom',
      key: 'social',
      type: 'json',
      value: JSON.stringify({
        instagram: 'https://instagram.com/thekashmirweaver',
        facebook: 'https://facebook.com/thekashmirweaver',
      }),
    },
  ];

  await adminGraphql(
    `#graphql
    mutation SetShopMetafields($metafields: [MetafieldsSetInput!]!) {
      metafieldsSet(metafields: $metafields) {
        userErrors { message field }
      }
    }`,
    {
      metafields: metafields.map((m) => ({
        ...m,
        ownerId: shopId,
      })),
    },
  );
  console.log('  ✓ shop metafields set');
}

async function ensureJournalBlog(): Promise<string | null> {
  try {
    const data = await adminGraphql<{
      blogs: {edges: Array<{node: {id: string; handle: string}}>};
    }>(`query { blogs(first: 20) { edges { node { id handle } } } }`);

    const existing = data.blogs.edges.find((e) => e.node.handle === 'journal');
    if (existing) return existing.node.id;

    const created = await adminGraphql<{
      blogCreate: {blog: {id: string}; userErrors: Array<{message: string}>};
    }>(
      `#graphql
      mutation CreateBlog($blog: BlogCreateInput!) {
        blogCreate(blog: $blog) {
          blog { id handle }
          userErrors { message }
        }
      }`,
      {blog: {title: 'Journal', handle: 'journal'}},
    );

    if (created.blogCreate.userErrors.length) {
      throw new Error(created.blogCreate.userErrors[0].message);
    }

    console.log('  ✓ blog "journal" created');
    return created.blogCreate.blog.id;
  } catch (err) {
    console.log(`  · journal blog skipped: ${(err as Error).message}`);
    return null;
  }
}

async function seedArticles(blogId: string | null) {
  if (!blogId) {
    console.log('  · articles skipped (no blog access or blog missing)');
    return;
  }
  for (const post of POSTS) {
    const article = ARTICLES[post.slug];
    const bodyHtml = article
      ? article.body.map((p) => `<p>${p}</p>`).join('')
      : `<p>${post.excerpt}</p>`;

    try {
      await adminGraphql(
        `#graphql
        mutation CreateArticle($article: ArticleCreateInput!) {
          articleCreate(article: $article) {
            article { id handle }
            userErrors { message }
          }
        }`,
        {
          article: {
            blogId,
            title: post.title,
            handle: post.slug,
            author: {name: 'The Kashmir Weaver'},
            body: bodyHtml,
            summary: post.excerpt,
            tags: [post.cat],
            isPublished: true,
            publishDate: post.date,
            image: {url: assetUrl(post.img), altText: post.title},
          },
        },
      );
      console.log(`  ✓ article ${post.slug}`);
    } catch (err) {
      console.log(`  · article ${post.slug}: ${(err as Error).message}`);
    }
    await sleep(400);
  }
}

async function seedCollections(): Promise<Map<string, string>> {
  const handleToId = new Map<string, string>();

  for (const col of collections) {
    try {
      const result = await adminGraphql<{
        collectionCreate: {
          collection: {id: string; handle: string};
          userErrors: Array<{message: string}>;
        };
      }>(
        `#graphql
        mutation CreateCollection($input: CollectionInput!) {
          collectionCreate(input: $input) {
            collection { id handle }
            userErrors { message }
          }
        }`,
        {
          input: {
            title: col.name,
            handle: col.handle,
            descriptionHtml: `<p>${col.story}</p>`,
            image: {src: assetUrl(col.hero.src), altText: col.hero.alt},
            seo: {
              title: col.seo?.title ?? `${col.name} — The Kashmir Weaver`,
              description: col.seo?.description ?? col.tagline,
            },
            metafields: [
              {namespace: 'custom', key: 'tagline', type: 'single_line_text_field', value: col.tagline},
              {namespace: 'custom', key: 'story', type: 'multi_line_text_field', value: col.story},
            ],
          },
        },
      );

      if (result.collectionCreate.userErrors.length) {
        throw new Error(result.collectionCreate.userErrors[0].message);
      }

      handleToId.set(
        col.handle,
        result.collectionCreate.collection.id,
      );
      console.log(`  ✓ collection ${col.handle}`);
    } catch (err) {
      console.log(`  · collection ${col.handle}: ${(err as Error).message}`);
    }
    await sleep(400);
  }

  return handleToId;
}

function productMetafields(product: Product) {
  return [
    {namespace: 'custom', key: 'story', type: 'multi_line_text_field', value: product.story},
    {namespace: 'custom', key: 'short_description', type: 'single_line_text_field', value: product.shortDescription},
    {namespace: 'custom', key: 'material', type: 'single_line_text_field', value: product.material},
    {namespace: 'custom', key: 'origin', type: 'single_line_text_field', value: product.origin},
    {namespace: 'custom', key: 'weave', type: 'single_line_text_field', value: product.weave},
    {namespace: 'custom', key: 'limited', type: 'boolean', value: String(!!product.limited)},
    {namespace: 'custom', key: 'show_colour_studio', type: 'boolean', value: String(!!product.showColourStudio)},
    {namespace: 'custom', key: 'stock_qty', type: 'number_integer', value: String(product.stockQty ?? 1)},
  ];
}

async function syncProductSizes(productId: string, product: Product) {
  const result = await adminGraphql<{
    productSet: {
      product: {id: string; handle: string};
      userErrors: Array<{field: string[]; message: string}>;
    };
  }>(
    `#graphql
    mutation SyncProductSizes($input: ProductSetInput!) {
      productSet(synchronous: true, input: $input) {
        product { id handle }
        userErrors { field message }
      }
    }`,
    {
      input: {
        id: productId,
        productOptions: shopifySizeProductOptions(),
        variants: buildSizeOnlyVariants(
          product.price.amount,
          product.compareAtPrice?.amount,
        ),
      },
    },
  );

  if (result.productSet.userErrors.length) {
    throw new Error(result.productSet.userErrors[0].message);
  }
}

async function seedProducts(collectionIds: Map<string, string>): Promise<Map<string, string>> {
  const productIdByHandle = new Map<string, string>();

  for (const product of products) {
    const media = product.images.map((img) => ({
      originalSource: assetUrl(img.src),
      mediaContentType: 'IMAGE',
      alt: img.alt,
    }));

    try {
      const result = await adminGraphql<{
        productCreate: {
          product: {id: string; handle: string};
          userErrors: Array<{message: string}>;
        };
      }>(
        `#graphql
        mutation CreateProduct($input: ProductInput!, $media: [CreateMediaInput!]) {
          productCreate(input: $input, media: $media) {
            product { id handle }
            userErrors { message }
          }
        }`,
        {
          input: {
            title: product.name,
            handle: product.handle,
            descriptionHtml: `<p>${product.description}</p>`,
            productType: product.productType ?? 'Pashmina',
            vendor: product.vendor ?? 'The Kashmir Weaver',
            tags: product.tags,
            productOptions: shopifySizeProductOptions(),
            metafields: productMetafields(product),
          },
          media,
        },
      );

      if (result.productCreate.userErrors.length) {
        throw new Error(result.productCreate.userErrors[0].message);
      }

      const productId = result.productCreate.product.id;
      productIdByHandle.set(product.handle, productId);
      await syncProductSizes(productId, product);

      const collectionId = collectionIds.get(product.collectionSlug);
      if (collectionId) {
        await adminGraphql(
          `#graphql
          mutation AddToCollection($id: ID!, $productIds: [ID!]!) {
            collectionAddProducts(id: $id, productIds: $productIds) {
              userErrors { message }
            }
          }`,
          {id: collectionId, productIds: [productId]},
        );
      }

      console.log(`  ✓ product ${product.handle}`);
    } catch (err) {
      console.log(`  · product ${product.handle}: ${(err as Error).message}`);
    }
    await sleep(500);
  }

  return productIdByHandle;
}

async function seedFeaturedCollection(productIdByHandle: Map<string, string>) {
  const featuredHandles = products.slice(0, 8).map((p) => p.handle);
  const productIds = featuredHandles
    .map((handle) => productIdByHandle.get(handle))
    .filter((id): id is string => id != null);

  if (!productIds.length) {
    console.log('  · homepage featured collection skipped (no product IDs)');
    return;
  }

  try {
    const result = await adminGraphql<{
      collectionCreate: {
        collection: {id: string; handle: string};
        userErrors: Array<{message: string}>;
      };
    }>(
      `#graphql
      mutation CreateFeaturedCollection($input: CollectionInput!) {
        collectionCreate(input: $input) {
          collection { id handle }
          userErrors { message }
        }
      }`,
      {
        input: {
          title: FEATURED_COLLECTION_TITLE,
          handle: DEFAULT_FEATURED_COLLECTION_HANDLE,
          descriptionHtml:
            '<p>Products shown on the homepage Featured Pieces carousel. Set sort to Manual and drag to reorder.</p>',
          sortOrder: 'MANUAL',
        },
      },
    );

    if (result.collectionCreate.userErrors.length) {
      throw new Error(result.collectionCreate.userErrors[0].message);
    }

    const collectionId = result.collectionCreate.collection.id;

    await adminGraphql(
      `#graphql
      mutation AddToFeaturedCollection($id: ID!, $productIds: [ID!]!) {
        collectionAddProducts(id: $id, productIds: $productIds) {
          userErrors { message }
        }
      }`,
      {id: collectionId, productIds},
    );

    console.log(`  ✓ collection ${DEFAULT_FEATURED_COLLECTION_HANDLE} (${productIds.length} products)`);
  } catch (err) {
    console.log(`  · collection ${DEFAULT_FEATURED_COLLECTION_HANDLE}: ${(err as Error).message}`);
  }
}

function hasCatalogScopes(scopes: Set<string>): boolean {
  return REQUIRED_SCOPES.catalog.every((s) => scopes.has(s));
}

async function main() {
  console.log(`\nSeeding ${SHOP} from static catalog…`);
  console.log(`Asset base URL: ${BASE_URL}\n`);

  const scopes = await checkAccessScopes();
  warnMissingScopes(scopes);
  const canSeedCatalog = hasCatalogScopes(scopes);

  console.log('1. Metafield definitions');
  await ensureMetafieldDefinitions();

  console.log('\n2. Shop metafields');
  const shopId = await getShopId();
  await setShopMetafields(shopId);

  if (!canSeedCatalog) {
    console.log('\n3–5. Journal, collections, products — skipped (missing scopes)');
    console.log('\nDone (shop metafields only).');
    console.log('Grant write_products + write_content, re-run npm run seed:shopify.');
    console.log('Keep USE_STATIC_CATALOG=true on Oxygen until catalog seed completes.\n');
    return;
  }

  console.log('\n3. Journal blog & articles');
  const blogId = await ensureJournalBlog();
  await seedArticles(blogId);

  console.log('\n4. Collections');
  const collectionIds = await seedCollections();

  console.log('\n5. Products');
  const productIdByHandle = await seedProducts(collectionIds);

  console.log('\n6. Homepage featured collection');
  await seedFeaturedCollection(productIdByHandle);

  console.log('\n7. Publish to Online Store (required for Storefront API)');
  await publishCatalogToStorefront();

  console.log('\nDone.');
  console.log(
    'If product/collection metafield definitions failed, create them in Admin → Settings → Custom data (namespace: custom).',
  );
  console.log('Remove USE_STATIC_CATALOG from Oxygen after catalog is live.\n');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
