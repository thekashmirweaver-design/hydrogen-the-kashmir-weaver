# SEO, performance & domains

How The Kashmir Weaver storefront handles search indexing, canonical URLs, and multi-domain redirects.

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
| `https://thekashmirweaver.in` | **Primary Hydrogen storefront (now)** | Index this. Submit sitemap here. |
| `www.thekashmirweaver.in` | Alias | 301 → apex `.in` (Hydrogen `server.ts`) |
| `https://thekashmirweaver.shop` | Legacy / alternate TLD | 301 → `.in` (Hydrogen `server.ts`) |
| `www.thekashmirweaver.shop` | Alias | 301 → `.in` |
| `https://thekashmirweaver.com` | Legacy app (Vercel) today; **Phase 2:** redirect → `.in` while DNS stays on old app; **Phase 3:** DNS → Hydrogen |
| `*.o2.myshopify.dev` | Oxygen preview | Do not submit to Google. Staff/preview only. |
| `70yuey-sr.myshopify.com` | Password-protected Online Store | Not the headless storefront; ignore for Hydrogen SEO. |
| `gulriza-kashmir-atelier.lovable.app` | Design prototype (separate repo) | Add `noindex` or take offline to avoid competing with production. |

---

## Migration plan (agreed strategy)

```text
Phase 1 (now)     thekashmirweaver.in   → Hydrogen (index here)
                  thekashmirweaver.shop → 301 → .in (this repo)
Phase 2 (later)   thekashmirweaver.com  → still old app, redirect users → .in
Phase 3 (final)   thekashmirweaver.com  → DNS points to Hydrogen (optional primary swap)
```

### Phase 1 — Now: index on `.in`

Hydrogen is live at **`thekashmirweaver.in`**. All SEO signals should reference this origin.

**Configuration:**

```bash
PUBLIC_STORE_URL=https://thekashmirweaver.in
```

Set on Oxygen **Production** environment variables and in local `.env`.

**Host redirects (in this repo):**

`server.ts` calls `redirectNonPrimaryStoreHost()` before React Router. These hostnames 301 to `PUBLIC_STORE_URL` with the same path and query:

- `thekashmirweaver.shop`, `www.thekashmirweaver.shop`
- `www.thekashmirweaver.in`

Both `.in` and `.shop` must be **connected** to the Hydrogen production environment in Shopify Admin so traffic reaches Oxygen.

**Search Console (do once):**

1. Add property: `thekashmirweaver.in`
2. Submit sitemap: `https://thekashmirweaver.in/sitemap.xml`
3. Monitor **Pages** and **Sitemap** reports for 404s

**Verify redirect:**

```bash
curl -sI "https://thekashmirweaver.shop/products/example"
# Expect: HTTP/1.1 301 → https://thekashmirweaver.in/products/example
```

---

### Phase 2 — Before `.com` moves here: old site redirects users to `.in`

When you are ready, change the **previous `.com` website** (still on Vercel / its current host — **DNS unchanged**).

That app gets redirect logic, for example:

```javascript
// On the legacy thekashmirweaver.com app (not this Hydrogen repo)
const PRIMARY_ORIGIN = 'https://thekashmirweaver.in';

window.location.replace(
  PRIMARY_ORIGIN + window.location.pathname + window.location.search,
);
```

Prefer **301 server redirects** (Vercel `redirects`, etc.) over JS-only for crawlers.

**Hydrogen:** No changes beyond Phase 1. Still canonical/index on `.in`.

---

### Phase 3 — When you decide: point `.com` at Hydrogen

Only when **`.com` should serve this storefront directly**:

1. Connect `thekashmirweaver.com` (+ `www`) in **Hydrogen → Production → Domains**.
2. Remove redirect logic from the old `.com` app.
3. Add `.com` to `REDIRECT_TO_PRIMARY_HOSTS` in `app/lib/store-host-redirect.ts` if `.com` should 301 → `.in`, **or** flip primary to `.com` and update `PUBLIC_STORE_URL` if `.com` becomes canonical.
4. Update Customer Account API OAuth — see [deploy.md](./deploy.md#custom-domain).
5. Search Console: new property / change of address as needed.

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
| Fallback | `DEFAULT_STORE_URL` in `seo.ts` (`https://thekashmirweaver.in`) |
| Host redirects | `app/lib/store-host-redirect.ts` — 301 `.shop` / `www.*` → primary |

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

Google Fonts blocking stylesheet was removed. Fonts load from `@fontsource/inter` and `@fontsource/cormorant-garamond` via `app/styles/globals.css`. Critical WOFF2 files are preloaded from `app/root.tsx`. CSP allows `https://cdn.shopify.com` for Oxygen-bundled font assets.

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

### `.in` cutover checklist (Phase 1)

- [ ] Connect `thekashmirweaver.in` in Hydrogen Production domains; set **Primary**
- [ ] Connect `thekashmirweaver.shop` (redirect still needs DNS → Shopify/Oxygen)
- [ ] `PUBLIC_STORE_URL=https://thekashmirweaver.in` on Oxygen + redeploy
- [ ] Update Customer Account API OAuth URIs for `.in`
- [ ] GSC: add `thekashmirweaver.in`, submit sitemap
- [ ] `curl -sI https://thekashmirweaver.shop/` → 301 to `.in`
- [ ] Spot-check canonical, OG tags, and JSON-LD on home + one PDP

### Legacy `.com` redirect checklist (Phase 2 — old app, not this repo)

- [ ] Redirect target is `https://thekashmirweaver.in` (+ same path where possible)
- [ ] Prefer server 301 in addition to (or instead of) `window.location` for SEO

### After deploy (any phase)

- [ ] `curl -sI https://thekashmirweaver.in/sitemap.xml` → 200
- [ ] View source on homepage: canonical href matches `PUBLIC_STORE_URL`
- [ ] [Rich Results Test](https://search.google.com/test/rich-results) on one product URL
- [ ] GSC Coverage: no spike in 404s

---

## FAQ

**Should we index both `.in` and `.shop`?**  
No. Index **`.in` only**. `.shop` 301s to `.in` so Google consolidates on one origin.

**Where is the `.shop` → `.in` redirect implemented?**  
`app/lib/store-host-redirect.ts`, invoked from `server.ts` before React Router.

**Where do I change the default domain in code?**  
`app/lib/seo.ts` → `DEFAULT_STORE_URL`, and `.env.example` / Oxygen `PUBLIC_STORE_URL`.

**Do we need hreflang for USD / CAD / EUR?**  
Not with the current setup. Currency is a query/session concern, not separate URLs.
