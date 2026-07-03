# Deploy & seed checklist

## 1. Get environment variables

**Recommended:** let Shopify CLI populate them.

```bash
npx shopify hydrogen link
npx shopify hydrogen env pull
```

Add to your local `.env` (if not already present after pull):

```bash
PUBLIC_CHECKOUT_DOMAIN=70yuey-sr.myshopify.com
USE_STATIC_CATALOG=true
```

Push to Oxygen (run in your terminal — requires confirmation prompt):

```bash
npx shopify hydrogen env push --env=production
```

**Production URL:** https://the-kashmir-weaver-4c08a749ba70084fdf74.o2.myshopify.dev

Or set vars manually in **Shopify Admin → Sales channels → Hydrogen → The Kashmir Weaver → Production → Environment variables**.

### Variable reference

| Variable | Required | Purpose |
| --- | --- | --- |
| `SESSION_SECRET` | Yes | Encrypts session cookies |
| `PUBLIC_STOREFRONT_API_TOKEN` | Yes | Storefront API (client + server) |
| `PRIVATE_STOREFRONT_API_TOKEN` | Yes | Server-side Storefront API |
| `PUBLIC_STORE_DOMAIN` | Yes | `your-store.myshopify.com` |
| `PUBLIC_STOREFRONT_ID` | Yes | Headless storefront numeric ID |
| `PUBLIC_CHECKOUT_DOMAIN` | Yes | Checkout domain (usually `{store}.myshopify.com`) |
| `USE_STATIC_CATALOG` | No | `true` until Admin seeded; remove when live |
| `CONCIERGE_WEBHOOK_URL` | No | Concierge form webhook |

## 2. Oxygen deploy

```bash
npm run build
npx shopify hydrogen deploy
```

Or connect the GitHub repo in **Shopify Admin → Hydrogen** for automatic deploys on push to `main`.

## 3. Seed Shopify Admin from static catalog

After deploy (so `/assets/*` URLs resolve), run locally:

```bash
cp .env.example .env
# Add SHOPIFY_ADMIN_ACCESS_TOKEN and PUBLIC_STORE_URL to .env

npm run seed:shopify
```

**Admin token:** Settings → Apps and sales channels → Develop apps → Create an app → Configure Admin API scopes (`write_products`, `write_content`, etc.) → Install → copy Admin API access token.

Then remove `USE_STATIC_CATALOG` from Oxygen and redeploy.

## 4. Manual Admin items (seed script skips)

- Navigation menus: `header-menu`, `footer-menu`
- Shop policies (shipping, refund, terms, privacy)
- Markets / currencies
- Product reviews app (`reviews.rating`, `reviews.rating_count`)

See [shopify-metafields.md](./shopify-metafields.md).

## 5. Smoke test

- `/` homepage featured + hero metafield
- `/collections/all` catalog + sort
- `/products/:handle` variants, reviews, JSON-LD
- `/cart` checkout flow
- `/journal` blog articles
- `/account` customer area
- `/sitemap/editorial.xml`
