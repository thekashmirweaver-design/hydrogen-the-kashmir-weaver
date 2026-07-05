# SEO, performance & domains

How The Kashmir Weaver storefront handles search indexing, canonical URLs, and the multi-domain migration from `.shop` (now) to `.com` (later).

**Related:** [deploy.md](./deploy.md) (Oxygen env, Customer Account OAuth, domain connection)

---

## Golden rule

**One primary domain for Google.** Every other hostname either:

- **301 redirects** to the primary (aliases like `www`, legacy domains), or
- **Is not indexed** (preview/staging URLs, old prototypes).

Do not index the same pages on two hostnames. That splits ranking signals and triggers duplicate-content issues.

---

## Domain inventory

| Hostname | Role today | SEO treatment |
| --- | --- | --- |
| `https://thekashmirweaver.shop` | **Primary Hydrogen storefront (now)** | Index this. Submit sitemap here. |
| `www.thekashmirweaver.shop` | Alias | Should 301 → apex `.shop` |
| `https://thekashmirweaver.com` | Legacy app (Vercel) today; **Phase 2:** `window.redirect` → `.shop` while DNS stays on old app; **Phase 3:** DNS → Hydrogen, primary domain |
| `*.o2.myshopify.dev` | Oxygen preview | Do not submit to Google. Staff/preview only. |
| `70yuey-sr.myshopify.com` | Password-protected Online Store | Not the headless storefront; ignore for Hydrogen SEO. |
| `gulriza-kashmir-atelier.lovable.app` | Design prototype (separate repo) | Add `noindex` or take offline to avoid competing with production. |

---

## Migration plan (agreed strategy)

Three phases. **`.com` DNS stays on the old app until Phase 3.** Phase 2 only adds redirect logic on that old app — Hydrogen is not involved yet.

```text
Phase 1 (now)     thekashmirweaver.shop  → Hydrogen (index here)
Phase 2 (later)   thekashmirweaver.com   → still old app, but window.redirect → .shop
Phase 3 (final)   thekashmirweaver.com   → DNS points to Hydrogen (primary domain)
```

### Phase 1 — Now: index on `.shop`

Hydrogen is live at **`thekashmirweaver.shop`**. All SEO signals should reference this origin.

**Configuration (already in place):**

```bash
PUBLIC_STORE_URL=https://thekashmirweaver.shop
```

Set on Oxygen **Production** environment variables and in local `.env`.

**Search Console (do once):**

1. Add property: `thekashmirweaver.shop`
2. Submit sitemap: `https://thekashmirweaver.shop/sitemap.xml`
3. Monitor **Pages** and **Sitemap** reports for 404s

**Do not point `.com` at Hydrogen yet.** The old site may still be indexed at `.com` — that is fine until Phase 2.

---

### Phase 2 — Before `.com` moves here: old site redirects users to `.shop`

When you are ready, you will change the **previous `.com` website** (still on Vercel / its current host — **DNS unchanged**).

That app gets hard client-side redirect logic, for example:

```javascript
// On the legacy thekashmirweaver.com app (not this Hydrogen repo)
const SHOP_ORIGIN = 'https://thekashmirweaver.shop';

// Sitewide: send humans to the same path on .shop
window.location.replace(SHOP_ORIGIN + window.location.pathname + window.location.search);
```

Or per-route logic if old URL paths differ — map old paths to the matching `.shop` URL.

**What this phase does:**

| | |
| --- | --- |
| **Users** | Anyone visiting `.com` lands on `.shop` (Hydrogen). |
| **DNS** | `.com` still points at the **old app** — only the old app’s JavaScript redirects. |
| **Hydrogen** | No changes. Still canonical/index on `.shop`. |
| **This repo** | Nothing to deploy for Phase 2 — work happens in the legacy `.com` codebase. |

**SEO note:** `window.location` redirects work for **people**, but Google passes ranking signals more reliably with **301 server redirects**. If the old app can also send a **301** (Vercel `redirects` in `vercel.json`, etc.), prefer that for crawlers — or use 301 instead of JS where possible. At minimum on the old app, consider `<link rel="canonical" href="https://thekashmirweaver.shop/...">` on indexed pages so Google consolidates on `.shop` while `.com` DNS still points elsewhere.

**Before Phase 2:**

1. Export top indexed `.com` URLs from Search Console.
2. Decide path mapping (old `.com` path → same path on `.shop`, or a small redirect table in the old app).

---

### Phase 3 — When you decide: point `.com` at Hydrogen

Only when you are ready for **`.com` to serve this storefront directly** (no more old app in the middle):

1. **Shopify Admin → Hydrogen → Production → Domains**  
   Connect `thekashmirweaver.com` (+ `www`). Set **`.com` as primary**.

2. **Remove** redirect logic from the old `.com` app (DNS no longer hits it).

3. **301 redirects** on Shopify (domain settings):  
   - `thekashmirweaver.shop` → `https://thekashmirweaver.com`  
   - `www.thekashmirweaver.com` → `https://thekashmirweaver.com`  
   - `www.thekashmirweaver.shop` → `https://thekashmirweaver.com`

4. **Update env and redeploy this repo:**

   ```bash
   PUBLIC_STORE_URL=https://thekashmirweaver.com
   ```

   Also update **Customer Account API** OAuth in Admin — see [deploy.md](./deploy.md#custom-domain).

5. **Update code default** in `app/lib/seo.ts` (`DEFAULT_STORE_URL`) to `.com`.

6. **Search Console:**  
   - Add / focus on `thekashmirweaver.com`  
   - Submit `https://thekashmirweaver.com/sitemap.xml`  
   - Use **Change of address** (`.shop` → `.com`) if `.shop` had meaningful traffic  

7. **Verify:** canonicals and JSON-LD use `https://thekashmirweaver.com/...`.

---

## International / markets

Markets use **`?country=` + session** for currency/pricing (`app/lib/i18n.ts`), not separate URLs per locale.

- **One URL per product/page** in the sitemap (no `/EN-US/products/...` prefixes).
- **No hreflang** until you ship truly different language/regional page copy at distinct URLs.
- **Canonical tags** point to the path only (no `?country=` param), consolidating market variants.

---

## What the codebase does

### Canonical URL source of truth

| Mechanism | Location |
| --- | --- |
| Env var | `PUBLIC_STORE_URL` — set on Oxygen; exposed as `publicStoreUrl` from root loader |
| SEO helpers | `app/lib/seo.ts` — `resolveStoreUrl`, `canonicalLink`, `seoBundle`, `absoluteUrl` |
| Fallback | `DEFAULT_STORE_URL` in `seo.ts` (currently `https://thekashmirweaver.shop`) |

Route `meta` exports use `seoBundle()` so every indexable page gets:

- `<link rel="canonical">`
- Absolute Open Graph / Twitter URLs (`og:site_name`, `og:url`, `og:image`)
- JSON-LD with absolute URLs where required

**Excluded from indexing:** `/search`, `/cart`, `/account/*` (`robots: noindex` + robots.txt rules).

### Structured data (JSON-LD)

| Page | Schema |
| --- | --- |
| Home | `Organization`, `WebSite` (+ `SearchAction`) |
| Product | `Product`, `BreadcrumbList` (+ `sku` when available) |
| Collection | `CollectionPage`, `BreadcrumbList`, `ItemList` |
| Journal article | `BlogPosting` |
| FAQ | `FAQPage` |

Shopify Admin **SEO title/description** fields feed meta tags when set (products, collections, pages, blog).

### Sitemaps

| URL | Contents |
| --- | --- |
| `/sitemap.xml` | Index: Shopify product/collection/page sitemaps + editorial sitemap |
| `/sitemap/editorial.xml` | Static editorial routes + journal article slugs |
| `/sitemap/{type}/{page}.xml` | Hydrogen-generated Shopify resources (single URL per item, no locale prefixes) |

### robots.txt

Generated at `/robots.txt`. Policy pages under `/policies/*` are **allowed** (trust/E-E-A-T). Cart, account, checkout, and search query URLs are disallowed.

---

## Performance & monitoring

### Self-hosted fonts

Google Fonts blocking stylesheet was removed. Fonts load from `@fontsource/inter` and `@fontsource/cormorant-garamond` via `app/styles/globals.css`. Critical WOFF2 files are preloaded from `app/root.tsx`.

### Images

- `CatalogImage` / `EditorialImage` — Shopify CDN srcset via Hydrogen `Image`
- Hero LCP: `fetchPriority="high"`, preload `/assets/hero-portrait.jpg` in root `links()`
- Product tiles: secondary images load on hover only; `prefetch="intent"` on product/collection links

### Catalog loading

Full catalog loads on shop routes (`/`, `/collections/*`, `/products/*`, `/search`). Editorial routes use a lighter **menu catalog** query (search + footer only).

### CI

- `npm run lighthouse` — Lighthouse CI via `.lighthouserc.cjs` (SEO ≥ 95, performance ≥ 85, LCP ≤ 2.5s)
- GitHub Actions `ci.yml` runs typecheck, build, and Lighthouse on `main` / PRs

### Real-user metrics

`app/entry.client.tsx` reports CLS, INP, and LCP via `web-vitals` (custom event `hydrogen:web-vitals` + gtag when present). Wire to GA4 / Shopify Web Pixels as needed.

---

## Checklists

### New route / page checklist

When adding an indexable route:

1. Export `meta` using `seoBundle()` from `~/lib/seo`
2. Pass `pathname: location.pathname` and `storeUrl: getStoreUrlFromMatches(matches)`
3. Add path to `sitemap.editorial[.xml].tsx` if it is not a Shopify product/collection/page
4. Confirm robots.txt does not disallow the path

### Domain cutover checklist (Phase 3 only — `.com` on Hydrogen)

- [ ] Phase 2 redirect removed from legacy `.com` app (or old app decommissioned)
- [ ] Connect `.com` in Hydrogen Production domains; set primary
- [ ] 301 `.shop` and all `www` variants → `.com`
- [ ] `PUBLIC_STORE_URL=https://thekashmirweaver.com` on Oxygen + redeploy
- [ ] Update Customer Account API OAuth URIs for `.com`
- [ ] Update `DEFAULT_STORE_URL` in `app/lib/seo.ts`
- [ ] GSC: new property, sitemap, change of address if applicable
- [ ] Spot-check canonical, OG tags, and JSON-LD on home + one PDP

### Legacy `.com` redirect checklist (Phase 2 — old app, not this repo)

- [ ] Redirect target is `https://thekashmirweaver.shop` (+ same path where possible)
- [ ] Path mapping documented for URLs that differ between old and new site
- [ ] Prefer server 301 in addition to (or instead of) `window.location` for SEO
- [ ] Hydrogen `PUBLIC_STORE_URL` still `https://thekashmirweaver.shop` — no change here

### After deploy (any phase)

- [ ] `curl -sI https://thekashmirweaver.shop/sitemap.xml` → 200
- [ ] View source on homepage: canonical href matches `PUBLIC_STORE_URL`
- [ ] [Rich Results Test](https://search.google.com/test/rich-results) on one product URL
- [ ] GSC Coverage: no spike in 404s

---

## FAQ

**Should we index both `.shop` and `.com`?**  
No. Phase 1–2: index **`.shop` only** (Hydrogen). Phase 2 sends `.com` **users** to `.shop` via the old app’s redirect; Google may still see `.com` until you noindex/canonical/301 from the old app. Phase 3: index **`.com` only**, with `.shop` 301 → `.com`.

**Phase 2 — does anything change in this Hydrogen repo?**  
No. Redirect logic lives in the **legacy `.com` codebase**. Hydrogen keeps serving and indexing `.shop`.

**Why mention 301 if we use `window.redirect`?**  
JS redirects move browsers; **301 server redirects** (e.g. Vercel `redirects`) pass SEO equity more reliably. Use both if you can; JS-only is acceptable for a short transition if `.shop` is already the GSC primary.

**Do we need hreflang for USD / CAD / EUR?**  
Not with the current setup. Currency is a query/session concern, not separate URLs.

**What if someone links to the Oxygen preview URL?**  
Do not use it in marketing. Preview URLs should not appear in sitemaps or Search Console.

**Where do I change the default domain in code?**  
`app/lib/seo.ts` → `DEFAULT_STORE_URL`, and `.env.example` / Oxygen `PUBLIC_STORE_URL`.
