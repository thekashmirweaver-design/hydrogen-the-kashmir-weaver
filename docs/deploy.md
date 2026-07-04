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

**Production URL:** https://thekashmirweaver.shop (`www` redirects to the apex)

Legacy Oxygen URL (still works for previews): https://the-kashmir-weaver-4c08a749ba70084fdf74.o2.myshopify.dev

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
| `PUBLIC_STORE_URL` | Recommended | Canonical storefront origin (`https://thekashmirweaver.shop`); seed scripts + CSP cross-origin during domain migration |

Customer Account API vars are created when you link the Hydrogen storefront. Confirm they exist in **Hydrogen → Production → Environment variables** (not just local `.env`).

## Fix `redirect_uri mismatch` on account login

Hydrogen sends OAuth to Shopify with:

```text
redirect_uri={your-storefront-origin}/account/authorize
```

For the primary custom domain that is:

```text
https://thekashmirweaver.shop/account/authorize
```

The legacy Oxygen URL callback still works if you serve traffic from it:

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
   | **Callback URI(s)** | `https://thekashmirweaver.shop/account/authorize` (and the Oxygen URL if still in use) |
   | **JavaScript origin(s)** | `https://thekashmirweaver.shop` (and the Oxygen URL if still in use) |
   | **Logout URI** | `https://thekashmirweaver.shop` (and the Oxygen URL if still in use) |

6. Save. Retry **Sign in** at `/account/login`.

Also enable **Settings → Customer accounts** (Customer accounts, not legacy).

### Option B — Shopify CLI (recommended)

From the repo root (linked to `70yuey-sr.myshopify.com`):

```bash
npx shopify hydrogen customer-account-push \
  --dev-origin=https://thekashmirweaver.shop \
  --storefront-id=gid://shopify/HydrogenStorefront/1000154618
```

Add a second `--dev-origin=…` run (or register manually in Admin) for the Oxygen URL if you still need account login there.

Hydrogen deploys usually auto-register Oxygen preview URLs; if the production URL changed or auto-registration failed, run the push command or add URIs manually.

### Custom domain

`PUBLIC_CHECKOUT_DOMAIN` does **not** change account OAuth — redirect uses the browser’s storefront origin (`request.url`).

When you add a custom domain (e.g. `https://thekashmirweaver.shop`), register **that** domain in Customer Account API setup as well:

- Callback: `https://thekashmirweaver.shop/account/authorize`
- JavaScript origin: `https://thekashmirweaver.shop`
- Logout URI: `https://thekashmirweaver.shop`

Keep Oxygen `.myshopify.dev` URIs if you still serve traffic from that URL.

### Local development

Customer Account API does not support `localhost`. Use a tunnel (ngrok, Cloudflare Tunnel) and push/register that HTTPS origin the same way.

### Verify account login

1. Open `https://thekashmirweaver.shop/account/login`
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

### Do **not** run `npm init @shopify/app@latest` in this repo

This project is an **existing Hydrogen storefront**, not a greenfield Partner app. The repo root already has:

- `shopify.app.toml` linked to **The Kashmir Weaver** (`client_id` `60df4f5aba046f1301c715771ac0c30b`)
- `npm run seed:shopify` → `scripts/seed-shopify-admin.ts`
- Hydrogen/Oxygen scripts (`shopify hydrogen dev`, `build`, `deploy`)

Running `npm init @shopify/app@latest` (or `shopify app init`) **in the repo root** scaffolds a Remix/React Router app layout and can overwrite or conflict with Hydrogen structure. **Skip it here.**

| Approach | When to use | Gets `shpat_` for seed? |
| --- | --- | --- |
| **A — `shopify store auth` (recommended)** | Any store you can log into; works when Partner install fails | **Yes** — 24h `shpat_…` (CLI stores it; copy into `.env`) |
| **B — Custom Admin app** (Option B below) | You want a **permanent** token without CLI | **Yes** — permanent `shpat_…` from **Develop apps** |
| **C — Partner app client credentials** | Store is in the **same** Partner org as the app | **24h** token via curl after Partner app install (not permanent `shpat_`) |

**What worked for `70yuey-sr.myshopify.com` (2026-07-03):** Partner OAuth install for `client_id` `60df4f5…` still returns `app_not_installed` (production store org ≠ Dev Dashboard org `224423153`). **`shopify store auth`** succeeded after a one-time browser OAuth prompt and produced a `shpat_…` token with full seed scopes. Catalog seed completed via `npm run seed:shopify`.

Do **not** put `SHOPIFY_API_SECRET` (`shpss_…`) in `SHOPIFY_ADMIN_ACCESS_TOKEN`; that field must be an Admin API access token.

Do **not** put an Admin `shpat_…` token in `PRIVATE_STOREFRONT_API_TOKEN`. Hydrogen sends a `Shopify-Storefront-Id` header with private tokens; an invalid private token returns **401** and the app falls back to static catalog. **Recommended:** leave `PRIVATE_STOREFRONT_API_TOKEN` unset on Oxygen so Hydrogen uses `PUBLIC_STOREFRONT_API_TOKEN` for server-side queries.

Products must be published to the **The Kashmir Weaver** headless sales channel (not only Online Store). After `shopify store auth` with `write_publications`, run `npm run publish:headless`.

**Custom apps in Admin (2026):** **Settings → Apps and sales channels → Develop apps** (not a separate “legacy custom app” wizard). There is **no** CLI or Admin GraphQL API to create custom apps programmatically — MCP confirms docs-only for app auth. `shopify app config` validates/links Partner apps only; it does not scaffold store custom apps.

#### Optional: scaffold a **separate** Partner app (only if you need a new app)

Run in a **sibling directory**, never inside `hydrogen-the-kashmir-weaver/`:

```bash
mkdir -p /Users/iambqc/Desktop/system/the-kashmir-weaver-admin-app
cd /Users/iambqc/Desktop/system/the-kashmir-weaver-admin-app

# Non-interactive (CI / scripting) — requires auth first: shopify auth login
CI=true npx shopify app init \
  --name "the-kashmir-weaver-seed" \
  --template none \
  --path . \
  --organization-id <your-org-id-from-dev-dashboard-url>

# Or link to an existing Partner app instead of creating one:
CI=true npx shopify app init \
  --client-id 60df4f5aba046f1301c715771ac0c30b \
  --template none \
  --path .
```

Useful flags: `--name`, `--path`, `--template none` (minimal), `--client-id` (link existing app), `--organization-id` (create new app in org). That folder is only for `shopify app deploy` / `shopify store auth` — **seed still runs from the Hydrogen repo** with `npm run seed:shopify`.

---

After deploy (so `/assets/*` URLs resolve), run locally:

```bash
cp .env.example .env
# Add SHOPIFY_ADMIN_ACCESS_TOKEN and PUBLIC_STORE_URL to .env

npm run seed:shopify
```

The seed script loads `.env` automatically. Do not commit `.env` to git.

**Collections only:** `npm run seed:collections` creates the five static collections and publishes them to Online Store + headless (requires `write_products` and `write_publications` on your Admin token).

Both options below need these scopes:

| Scope | Needed for |
| --- | --- |
| `write_products`, `read_products` | Products, collections, variants, metafield definitions |
| `write_content`, `read_content` | Journal blog and articles |
| `write_online_store_navigation`, `read_online_store_navigation` | Header/footer menus |
| `write_legal_policies`, `read_legal_policies` | Shipping/refund/terms/privacy policies |
| `read_publications`, `write_publications` | Publish products/collections to Online Store + headless channel |

`shopify.app.toml` includes all of the above. Metafield definitions use the underlying resource scopes (`write_products` for product/collection/shop metafields) — no separate metafield-definition scopes exist.

**Full scope string** (copy for `shopify store auth --scopes`):

```text
read_products,write_products,read_content,write_content,read_online_store_navigation,write_online_store_navigation,read_legal_policies,write_legal_policies,read_publications,write_publications
```

Set `PUBLIC_STORE_URL` to the live Oxygen URL (so `/assets/*` image URLs resolve during seed):

```bash
PUBLIC_STORE_URL=https://thekashmirweaver.shop
```

### Option A — `shopify store auth` (CLI, recommended)

Deploys scopes to the Partner app, then authorizes the **CLI store app** on the merchant store (separate from Partner `client_id` install). One browser OAuth prompt; token valid ~24 hours.

> **CLI note:** `shopify store auth` requires **Shopify CLI 4+** (`npx @shopify/cli@latest`). The repo’s `@shopify/cli@3.85.4` does not include `store auth`. Use the npm scripts below.

```bash
# 1. Release scopes from shopify.app.toml to Dev Dashboard
npm run auth:deploy-scopes

# 2. Authorize on the store (opens browser once; requires Shopify CLI 4+)
npm run auth:store

# 3. Verify scopes include write_publications
npm run auth:verify-scopes

# 4. Copy token into local .env (CLI stores it; seed scripts read .env)
npm run auth:sync-env

# 5. Re-publish collections (already created; publish step only)
npm run seed:collections
```

`shopify store execute` uses the same stored token for ad-hoc Admin GraphQL (add `--allow-mutations` for writes).

### Option B — Custom Admin app (store Admin, permanent token)

1. **Settings → Apps and sales channels → Develop apps → Create an app**
2. **Configuration → Admin API integration → Configure**
3. Enable **all scopes in the table above**, including `read_publications` and `write_publications`
4. **Install app** → copy **Admin API access token** → `SHOPIFY_ADMIN_ACCESS_TOKEN` in local `.env`
5. Run `npm run seed:shopify`

### Option C — Partner app install + client credentials

This repo includes `shopify.app.toml` linked to **The Kashmir Weaver** (`client_id` `60df4f5aba046f1301c715771ac0c30b`). Scopes:

```toml
scopes = "read_products,write_products,read_content,write_content,read_online_store_navigation,write_online_store_navigation,read_legal_policies,write_legal_policies,read_publications,write_publications"
```

#### 1. Deploy scopes to Partners

From the repo root (logged in via `shopify auth login`):

```bash
shopify app deploy --force --no-build
```

This releases a new app version (e.g. `the-kashmir-weaver-5`) with the scopes above.

#### 2. Install the Partner app on `70yuey-sr.myshopify.com`

Partner apps no longer expose a permanent `shpat_…` token in Admin. Install the app first, then obtain a short-lived token (step 3).

> **Note:** On production stores outside the Dev Dashboard org, Partner install URLs and client-credentials grant may return `app_not_installed`. Use **Option A (`shopify store auth`)** instead.

**Option 2a — CLI store auth (works on this store)**

Same as Option A above.

**Option 2b — Install URL**

Open while logged into the store Admin:

```text
https://70yuey-sr.myshopify.com/admin/oauth/install?client_id=60df4f5aba046f1301c715771ac0c30b
```

Or **Dev Dashboard → Apps → The Kashmir Weaver → Test on development store** and select the store.

> **Note:** `shopify app dev --store 70yuey-sr.myshopify.com` fails if the store is not a dev store in the same Partner org. Use `shopify store auth` or the install URL instead.

#### 3. Get an Admin API access token

`shopify app env show` exposes **client credentials only** (not an access token):

```bash
npx shopify app env show
# SHOPIFY_API_KEY=…
# SHOPIFY_API_SECRET=shpss_…
# SCOPES=read_content,read_products,write_content,write_products
```

After the app is installed on the store, exchange credentials for a **24-hour** token via the [client credentials grant](https://shopify.dev/docs/apps/build/authentication-authorization/access-tokens/client-credentials-grant) (same org as the store):

```bash
eval "$(npx shopify app env show | sed 's/^[[:space:]]*//')"
curl -s -X POST "https://70yuey-sr.myshopify.com/admin/oauth/access_token" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "grant_type=client_credentials" \
  -d "client_id=${SHOPIFY_API_KEY}" \
  -d "client_secret=${SHOPIFY_API_SECRET}" \
  | jq -r '.access_token'
```

Add the token and storefront URL to local `.env` (do not commit):

```bash
SHOPIFY_ADMIN_ACCESS_TOKEN=<token from curl>
PUBLIC_STORE_URL=https://thekashmirweaver.shop
```

If client credentials returns `app_not_installed`, complete step 2 first. Tokens expire after ~24h — re-run the curl command before seeding.

#### 4. Run the seed script

```bash
npm run seed:shopify
```

The script checks scopes at startup via `currentAppInstallation`. Custom Admin tokens (Option A) may return `ACCESS_DENIED` for that query — the script warns and continues with shop metafields only. Without `write_products` / `write_content` it skips catalog and journal. Re-run after granting scopes and installing with a token that includes them.

Then set `USE_STATIC_CATALOG=false` locally and push env vars to Oxygen (step 5 below).

#### 5. Push env vars to Oxygen (interactive)

`hydrogen env push` has no `--force` flag — run this in your **local terminal** (not CI):

```bash
# In .env: USE_STATIC_CATALOG=false  (or remove the line)
npx shopify hydrogen env push --env=production
# Confirm when prompted
```

Pushing sets `USE_STATIC_CATALOG=false` on Production. Redeploy if Oxygen does not pick up the change automatically.

#### 6. Menus and shop policies

```bash
npm run seed:menus
```

Requires Admin scopes `write_online_store_navigation` and `write_legal_policies`. Creates:

| Handle | Links |
| --- | --- |
| `header-menu` | Shop, Collections, Heritage, Craft, Journal, Concierge |
| `footer-menu` | Same + FAQ, Care Guide, Terms, Privacy, Shipping/Refund policies |

Updates shipping, refund, and terms-of-service policies. Privacy policy is skipped when Admin auto-manages it (Settings → Policies → disable automatic management to customize).

## 4. Remaining manual Admin items

- Markets / currencies
- Product reviews app (`reviews.rating`, `reviews.rating_count`)

See [shopify-metafields.md](./shopify-metafields.md).

## Making the storefront public

Oxygen environments are **private by default**. A `302` redirect to `accounts.shopify.com` via `cf-auth-worker.myshopify.dev` means **staff preview auth**, not a bug in the Hydrogen app. Pushing env vars (`hydrogen env push`) or deploying code does **not** change URL privacy.

### Verify current status

```bash
curl -sI "https://the-kashmir-weaver-4c08a749ba70084fdf74.o2.myshopify.dev"
```

| Response | Meaning |
| --- | --- |
| `302` → `accounts.shopify.com` / `cf-auth-worker` | Environment is **Private** (staff login required) |
| `200` with `powered-by: Shopify, Oxygen` | Environment is **Public** or traffic is on a custom domain |

There is **no Shopify CLI command** to toggle URL privacy or attach custom domains. Use Admin (below) or temporary bypass tokens for CI.

### Option A — Make the Production Oxygen URL public (fastest)

Use this when you want the default `*.o2.myshopify.dev` URL reachable without staff login.

1. **Shopify Admin → Sales channels → Hydrogen → The Kashmir Weaver**
2. **Storefront settings → Environments and variables**
3. Click **Production**
4. Under **URL privacy**, select **Public**
5. **Save**, then redeploy if prompted (or **… → Redeploy environment** on the production card)

Plan limit: Basic and Shopify plans get **1 public environment** (Production counts). Making Production public uses that slot.

After saving, re-run the `curl` check above — you should get `HTTP/2 200` instead of `302`.

Also disable storefront password protection if customers should browse without a password:

1. **Online Store → Preferences**
2. Deselect **Restrict access to visitors with the password**
3. **Save**

(`70yuey-sr.myshopify.com` currently redirects to `/password`.)

### Option B — Custom domain (recommended for launch)

Custom domains attached to the **Production** Hydrogen environment are publicly accessible and are the right long-term setup for SEO and Customer Account OAuth.

**Current domain check (Jul 2026):**

| Domain | Status |
| --- | --- |
| `thekashmirweaver.shop` | **Live** — primary Hydrogen production storefront (`www` → apex) |
| `thekashmirweaver.com` / `www.thekashmirweaver.com` | Separate site (Vercel) — repoint DNS only if you want `.com` on Oxygen too |
| `70yuey-sr.myshopify.com` | **Password-protected** Online Store |

**Steps:**

1. **Settings → Domains** — confirm `thekashmirweaver.shop` is connected and set as **Primary** for the Hydrogen production environment.
2. Point DNS to Shopify if not already done (A/CNAME records shown in Admin).
3. **Hydrogen → The Kashmir Weaver → Production → Domains** — connect the domain to the production environment.
4. Register the custom origin in **Customer Account API** setup (see [Custom domain](#custom-domain) above) and run:

   ```bash
   npx shopify hydrogen customer-account-push \
     --dev-origin=https://thekashmirweaver.shop \
     --storefront-id=gid://shopify/HydrogenStorefront/1000154618
   ```

5. Set Oxygen env `PUBLIC_STORE_URL=https://thekashmirweaver.shop` and redeploy (CSP + seed scripts).
6. Disable Online Store password (Option A, last step).

Verify:

```bash
curl -sI "https://thekashmirweaver.shop"
# Expect: HTTP/2 200, powered-by: Shopify, Oxygen
```

### Option C — Shareable deployment links (preview / stakeholder review)

For individual deployments (not permanent production access):

1. Open the deployment in **Hydrogen → Deployments**
2. **Share → Anyone with the link**

Shareable links include a token in the URL. They are for trusted reviewers only; Oxygen serves `robots.txt` disallow rules on shared preview URLs.

### Option D — Auth bypass token (CI / E2E only, temporary)

For automated tests against a **private** deployment URL (valid 1–12 hours, not for customers):

```bash
CI=true npx shopify hydrogen deploy -f \
  --auth-bypass-token --auth-bypass-token-duration=12 \
  --token="$SHOPIFY_HYDROGEN_DEPLOYMENT_TOKEN"
```

Pass the token from `h2_deploy_log.json` as a request header:

```text
oxygen-auth-bypass-token: <token>
```

Auth bypass tokens work only on the specific `*.o2.myshopify.dev` deployment URL, not on custom domains.

### CLI reference (what does *not* make the site public)

| Command | Effect |
| --- | --- |
| `shopify hydrogen env push --env=production` | Syncs env vars only |
| `shopify hydrogen deploy` | Deploys code; privacy unchanged |
| `shopify hydrogen env list` | Shows environment URLs |
| `shopify store execute` | Admin GraphQL; no Hydrogen domain/privacy mutations via CLI |

## 5. Smoke test

**Note:** Until Production URL privacy is **Public** (Option A) or a custom domain is connected (Option B), the default Oxygen URL (`*.o2.myshopify.dev`) returns staff preview auth (`302` → `cf-auth-worker`). That is expected for private environments.

| Check | URL / action | Pass criteria |
| --- | --- | --- |
| Homepage | `/` | Hero, featured products/collections render (`USE_STATIC_CATALOG=true` uses static data until seeded) |
| Catalog | `/collections/all` | Product grid loads; sort works |
| PDP | `/products/:handle` | Variants, price, JSON-LD, images |
| Cart | `/cart` | Add to cart; proceed to checkout |
| Journal | `/journal` | Article list (static or Admin-seeded) |
| Account login | `/account/login` | Redirects to Shopify login — **no** `redirect_uri mismatch` |
| Account area | `/account/orders`, `/account/profile` | Loads when signed in |
| Sign out | Header → Sign out | Returns to storefront |
| SEO | `/sitemap/editorial.xml` | Valid XML sitemap |
| Assets | `/assets/hero-portrait.jpg` | 200 (required for seed script image URLs) |
