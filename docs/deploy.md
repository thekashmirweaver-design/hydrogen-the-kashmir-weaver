# Deploy & seed checklist

## 1. Oxygen deploy

From the project root with Shopify CLI authenticated:

```bash
npm run build
npx shopify hydrogen link   # once, if not linked
npx shopify hydrogen deploy
```

Or connect the GitHub repo in **Shopify Admin → Hydrogen** for automatic deploys on push to `main`.

## 2. Environment variables (Oxygen)

| Variable | Required | Purpose |
| --- | --- | --- |
| `SESSION_SECRET` | Yes | Session encryption |
| `PUBLIC_STOREFRONT_API_TOKEN` | Yes | Storefront API |
| `PRIVATE_STOREFRONT_API_TOKEN` | Yes | Server-side Storefront API |
| `PUBLIC_STORE_DOMAIN` | Yes | Shop domain |
| `SHOPIFY_STOREFRONT_ID` | Yes | Storefront ID |
| `CONCIERGE_WEBHOOK_URL` | No | Concierge form webhook |
| `USE_STATIC_CATALOG` | No | Set `true` until Admin is seeded; remove when live |

Copy from [`.env.example`](../.env.example).

## 3. Seed Shopify Admin from static catalog

After deploy (so `/assets/*` URLs resolve), run:

```bash
cp .env.example .env
# Fill SHOPIFY_ADMIN_ACCESS_TOKEN and PUBLIC_STORE_URL

npm run seed:shopify
```

This creates metafield definitions, shop settings, the `journal` blog, collections, and products from the static catalog in `app/models/static/`.

Then remove `USE_STATIC_CATALOG` from Oxygen and redeploy.

## 4. Manual Admin items (if seed script skips)

- Navigation menus: `header-menu`, `footer-menu`
- Shop policies (shipping, refund, terms, privacy)
- Markets / currencies in Shopify Admin
- Product reviews via **Shopify Product Reviews** or compatible app (`reviews.rating`, `reviews.rating_count` metafields)

See [shopify-metafields.md](./shopify-metafields.md) for metafield keys.

## 5. Smoke test

- `/` homepage featured + hero metafield
- `/collections/all` catalog + sort
- `/products/:handle` variants, reviews, JSON-LD
- `/cart` checkout flow
- `/journal` blog articles
- `/account` customer area
- `/sitemap/editorial.xml`
