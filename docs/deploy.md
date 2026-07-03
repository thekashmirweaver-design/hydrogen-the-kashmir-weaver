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
| `PUBLIC_CHECKOUT_DOMAIN` | Yes | Checkout domain (usually `{store}.myshopify.com`); used for checkout URLs only, **not** account OAuth |
| `PUBLIC_CUSTOMER_ACCOUNT_API_CLIENT_ID` | Yes (account login) | OAuth client ID from Customer Account API settings |
| `PUBLIC_CUSTOMER_ACCOUNT_API_URL` | Yes (account login) | Shop Customer Account API base URL (`https://shopify.com/{shop_id}`) |
| `SHOP_ID` | Yes (account login) | Numeric shop ID (same as in `PUBLIC_CUSTOMER_ACCOUNT_API_URL`) |
| `USE_STATIC_CATALOG` | No | `true` until Admin seeded; remove when live |
| `CONCIERGE_WEBHOOK_URL` | No | Concierge form webhook |

Customer Account API vars are created when you link the Hydrogen storefront. Confirm they exist in **Hydrogen → Production → Environment variables** (not just local `.env`).

## Fix `redirect_uri mismatch` on account login

Hydrogen sends OAuth to Shopify with:

```text
redirect_uri={your-storefront-origin}/account/authorize
```

For this Oxygen production URL that is:

```text
https://the-kashmir-weaver-4c08a749ba70084fdf74.o2.myshopify.dev/account/authorize
```

The app routes are already correct (`account_.login.tsx` → `/account/login`, `account_.authorize.tsx` → `/account/authorize`). A mismatch means Shopify Admin does not have that exact callback URI registered for client `PUBLIC_CUSTOMER_ACCOUNT_API_CLIENT_ID`.

### Option A — Shopify Admin (manual)

1. **Shopify Admin → Sales channels → Hydrogen → The Kashmir Weaver**
2. **Storefront settings → Customer Account API**
3. Confirm **Client type** is **Public** (required for JavaScript origin and Logout URI fields).
4. Under **Application setup**, click **Edit** (pencil icon).
5. Add these values using the **exact** production origin (no trailing slash on origins):

   | Field | Value |
   | --- | --- |
   | **Callback URI(s)** | `https://the-kashmir-weaver-4c08a749ba70084fdf74.o2.myshopify.dev/account/authorize` |
   | **JavaScript origin(s)** | `https://the-kashmir-weaver-4c08a749ba70084fdf74.o2.myshopify.dev` |
   | **Logout URI** | `https://the-kashmir-weaver-4c08a749ba70084fdf74.o2.myshopify.dev` |

6. Save. Retry **Sign in** at `/account/login`.

Also enable **Settings → Customer accounts** (Customer accounts, not legacy).

### Option B — Shopify CLI (recommended)

From the repo root (linked to `70yuey-sr.myshopify.com`):

```bash
npx shopify hydrogen customer-account-push \
  --dev-origin=https://the-kashmir-weaver-4c08a749ba70084fdf74.o2.myshopify.dev \
  --storefront-id=gid://shopify/HydrogenStorefront/1000154618
```

Replace the origin with your current Oxygen URL and the storefront ID with `PUBLIC_STOREFRONT_ID` from env. Default callback path is `/account/authorize` (matches this repo).

Hydrogen deploys usually auto-register Oxygen preview URLs; if the production URL changed or auto-registration failed, run the push command or add URIs manually.

### Custom domain

`PUBLIC_CHECKOUT_DOMAIN` does **not** change account OAuth — redirect uses the browser’s storefront origin (`request.url`).

When you add a custom domain (e.g. `https://www.example.com`), register **that** domain in Customer Account API setup as well:

- Callback: `https://www.example.com/account/authorize`
- JavaScript origin: `https://www.example.com`
- Logout URI: `https://www.example.com`

Keep Oxygen `.myshopify.dev` URIs if you still serve traffic from that URL.

### Local development

Customer Account API does not support `localhost`. Use a tunnel (ngrok, Cloudflare Tunnel) and push/register that HTTPS origin the same way.

### Verify account login

1. Open `https://the-kashmir-weaver-4c08a749ba70084fdf74.o2.myshopify.dev/account/login`
2. You should reach Shopify’s login screen (no `redirect_uri mismatch`).
3. After login, you land on `/account/orders` (or the page that triggered login).
4. Header shows **Account** instead of **Sign in**; `/account/profile` loads customer details.
5. **Sign out** (`POST /account/logout`) returns to the storefront without errors.

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
- `/account/login` → Shopify login (no `redirect_uri mismatch`)
- `/account` customer area (orders, profile, addresses)
- `/sitemap/editorial.xml`
