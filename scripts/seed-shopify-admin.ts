/**
 * Seeds Shopify Admin from the static catalog in app/models/static/.
 *
 * Requires:
 *   PUBLIC_STORE_DOMAIN or SHOPIFY_STORE_DOMAIN  (e.g. your-store.myshopify.com)
 *   SHOPIFY_ADMIN_ACCESS_TOKEN                   (Admin API access token)
 *   PUBLIC_STORE_URL                               (deployed URL for /assets images)
 *
 * Run: npm run seed:shopify
 */
import {products, collections} from '../app/models/static/repository.ts';
import {POSTS, ARTICLES} from '../app/models/static/journal.ts';
import type {Product} from '../app/models/types.ts';

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
  const featuredHandles = products.slice(0, 8).map((p) => p.handle);
  const collectionHandles = collections.slice(0, 4).map((c) => c.handle);

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
        productHandles: featuredHandles,
        collectionHandles,
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
        email: 'concierge@thekashmirweaver.com',
        phone: '+1 (212) 555-0198',
        whatsapp: '+919876543210',
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
    {namespace: 'custom', key: 'stock_qty', type: 'number_integer', value: String(product.stockQty ?? 1)},
  ];
}

async function seedProducts(collectionIds: Map<string, string>) {
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
            metafields: productMetafields(product),
          },
          media,
        },
      );

      if (result.productCreate.userErrors.length) {
        throw new Error(result.productCreate.userErrors[0].message);
      }

      const productId = result.productCreate.product.id;

      const variantData = await adminGraphql<{
        product: {variants: {edges: Array<{node: {id: string}}>}} | null;
      }>(
        `query ProductVariant($id: ID!) {
          product(id: $id) {
            variants(first: 1) { edges { node { id } } }
          }
        }`,
        {id: productId},
      );

      const variantId = variantData.product?.variants.edges[0]?.node.id;
      if (variantId) {
        await adminGraphql(
          `#graphql
          mutation UpdateVariant($productId: ID!, $variants: [ProductVariantsBulkInput!]!) {
            productVariantsBulkUpdate(productId: $productId, variants: $variants) {
              userErrors { message }
            }
          }`,
          {
            productId,
            variants: [
              {
                id: variantId,
                price: String(product.price.amount),
                compareAtPrice: product.compareAtPrice
                  ? String(product.compareAtPrice.amount)
                  : undefined,
              },
            ],
          },
        );
      }
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
}

async function main() {
  console.log(`\nSeeding ${SHOP} from static catalog…\n`);

  console.log('1. Metafield definitions');
  await ensureMetafieldDefinitions();

  console.log('\n2. Shop metafields');
  const shopId = await getShopId();
  await setShopMetafields(shopId);

  console.log('\n3. Journal blog & articles');
  const blogId = await ensureJournalBlog();
  await seedArticles(blogId);

  console.log('\n4. Collections');
  const collectionIds = await seedCollections();

  console.log('\n5. Products');
  await seedProducts(collectionIds);

  console.log('\nDone.');
  console.log(
    'If product/collection metafield definitions failed, create them in Admin → Settings → Custom data (namespace: custom).',
  );
  console.log(
    'If blog/products failed, grant your Admin API app scopes: write_products, write_content, read_content.',
  );
  console.log('Remove USE_STATIC_CATALOG from Oxygen after catalog is live.\n');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
