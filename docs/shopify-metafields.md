# Shopify metafields setup

The Hydrogen storefront reads catalog and site content from Shopify metafields in the **`custom`** namespace. Configure these in **Shopify Admin → Settings → Custom data** before connecting the live catalog.

Each definition must have **Storefront API access** enabled so the Storefront API can read it.

## Product metafields

| Key | Name | Type | Purpose |
| --- | --- | --- | --- |
| `story` | Story | Multi-line text | Long-form product narrative shown on the product page |
| `short_description` | Short description | Single line text | Card and SEO summary; falls back to truncated product description |
| `material` | Material | Single line text | Fibre / composition (e.g. `100% pure pashmina cashmere`) |
| `origin` | Origin | Single line text | Place of craft (e.g. `Srinagar, Kashmir`) |
| `weave` | Weave | Single line text | Weave or embroidery technique |
| `limited` | Limited edition | True or false | Marks one-of-a-kind or limited pieces |
| `stock_qty` | Stock quantity | Integer | Display stock count; used with variant availability |
| `featured` | Featured | True or false | Adds this product to the homepage featured list (appended after any curated `homepage_featured` handles) |

**Owner:** Product

## Collection metafields

| Key | Name | Type | Purpose |
| --- | --- | --- | --- |
| `tagline` | Tagline | Single line text | Short hero line on collection cards, detail eyebrow, and search |
| `story` | Story | Multi-line text | Collection narrative; falls back to collection description |

**Search engine listing (Shopify Admin):** Set **Page title** and **Meta description** on each collection (or run `npm run seed:collections` to sync from static `seo` fields). The storefront uses these for `<title>`, meta description, OG tags, and JSON-LD.

**Owner:** Collection

## Shop metafields

| Key | Name | Type | Purpose |
| --- | --- | --- | --- |
| `marquee_messages` | Marquee messages | JSON | Array of announcement strings for the site marquee |
| `contact_email` | Contact email | Single line text | Footer / contact email |
| `contact_phone` | Contact phone | Single line text | Footer / contact phone |
| `contact_whatsapp` | Contact WhatsApp | Single line text | WhatsApp number or link |
| `instagram_url` | Instagram URL | URL | Social link |
| `facebook_url` | Facebook URL | URL | Social link |
| `homepage_featured` | Homepage featured | JSON | `{ "productHandles": ["..."], "collectionHandles": ["..."] }` for homepage curation |

**Owner:** Shop

### `homepage_featured` JSON example

```json
{
  "productHandles": ["midnight-emerald-jamawar", "heritage-kani-shawl"],
  "collectionHandles": ["jamawar-embroidery", "kani-pashmina"],
  "heroImageUrl": "https://your-store.com/assets/hero-portrait.jpg",
  "heroAlt": "Hero image alt text"
}
```

Selection order: curated `productHandles` first (in the order listed), then any product with `custom.featured` set to true, then — only if both are empty — the first eight products in catalog order. Collections fall back to all collections in catalog order when `collectionHandles` is empty.

## Product reviews (optional)

When using **Shopify Product Reviews** or a compatible app, the storefront reads standard metafields:

| Namespace | Key | Purpose |
| --- | --- | --- |
| `reviews` | `rating` | Average rating (JSON rating type) |
| `reviews` | `rating_count` | Number of reviews |

These display on the product page and in JSON-LD when present.

### Marquee messages format

Store as JSON array:

```json
[
  "Authentic Kashmiri Pashmina",
  "Handcrafted by Artisans",
  "Free Worldwide Shipping Over $200",
  "Certificate of Authenticity Included"
]
```

Newline-separated text is also supported as a fallback.

## Navigation menus

Create two menus in **Shopify Admin → Online Store → Navigation**:

| Handle | Purpose |
| --- | --- |
| `header-menu` | Primary site navigation |
| `footer-menu` | Footer links |

Menu handles must match exactly. The storefront queries both in `SHOP_CATALOG_QUERY`.

## Admin checklist

1. Create all metafield definitions under namespace **`custom`** with the keys above.
2. Enable **Storefront API** read access on every definition.
3. Fill metafields on products, collections, and shop settings.
4. Assign products to collections so collection slug and name resolve correctly.
5. Create `header-menu` and `footer-menu` navigation menus.
6. Deploy with a valid Storefront API token; the app tries Shopify first and falls back to static catalog data when Shopify is unavailable or `useStatic: true` is passed.

## Code references

- Metafield keys: `app/models/shopify/metafields.ts`
- Storefront queries: `app/models/shopify/queries.ts`
- Response mappers: `app/models/shopify/mappers.ts`
- Repository: `app/models/shopify/repository.ts`
- Catalog fallback: `app/models/catalog.repository.ts`

## Usage in loaders

Pass the Hydrogen `storefront` client from route context when live data is required:

```ts
import * as CatalogRepository from '~/models/catalog.repository';

export async function loader({context}: Route.LoaderArgs) {
  const products = await CatalogRepository.listProducts({
    storefront: context.storefront,
  });

  return {products};
}
```

Force static catalog during local development:

```ts
await CatalogRepository.getCatalogSnapshot({useStatic: true});
```
