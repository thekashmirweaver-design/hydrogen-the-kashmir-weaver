# Misrepresentation policy audit — where we are wrong

**Policy:** [Google Merchant Center — Misrepresentation](https://support.google.com/merchants/answer/6150127)  
**Account:** `5822844259` · **Store:** `70yuey-sr.myshopify.com` · **Live:** https://thekashmirweaver.shop  
**Audited:** 2026-07-17 via Shopify CLI + Merchant Center API (`user-merchant-data-mcp`) + live crawl  
**Codebase:** `main` @ `435432c` (cancellation page removed — **Oxygen not redeployed**; live still serves `/cancellation`)

---

## Bottom line

Google is not accusing you of a specific product scam in the feed. The API shows **account-level** `policy_enforcement_account_disapproval` with resolution **`merchant_action`**. That maps to: *Google cannot verify a single, truthful business identity and offer experience*.

The **clearest concrete error** found today is **address mismatch** across systems. That alone can sustain Misrepresentation (“present a false identity… or contact information”).

Secondary risks: fibre claims (Cashmere / Pashmina / “100% Pure”), deploy drift, weak identity verification unlock, and multi-country feed hygiene.

---

## Critical wrong: business address inconsistency

| Source | Address |
| --- | --- |
| **Shopify Admin** `shop.billingAddress` (CLI) | **17 Batamaloo - Tengpur Road Mominabad**, Srinagar, J&K 190009, India |
| **Website** (`BUSINESS` / About / footer) | **H 10-A, Firdousa Abad, Batamaloo**, Srinagar, J&K 190009, India |
| **Merchant Center** `businessInformation.address` | **H 10-A, Firdousa Abad, Batamaloo**, Srinagar, J&K 190009, India |
| **Google Business Profile** | Linked & active (must match the same NAP you verify with documents) |

**Policy mapping:** *Unacceptable business practices → Present a false identity, business name, or contact information* / *Omission / unclear business identity*.

**Fix (pick ONE legal address and use everywhere):**
1. Decide the registered / operating address on your GST + bank + ID docs.  
2. Set that exact string in: Shopify Admin → Settings → Store details, Hydrogen `app/lib/business.ts`, site About/footer, Merchant Center Business information, Google Business Profile, Payments profile.  
3. Complete **Identity Verification** with documents that show **that same address**.

Until this is one address, appeals often fail even with nice policy pages.

---

## Policy checklist — what Google forbids vs our status

### 1. Unacceptable business practices (identity / scam patterns)

| Policy risk | Our status | Verdict |
| --- | --- | --- |
| False / inconsistent identity or contact info | Shopify billing ≠ site ≠ (must match) IDV docs | **WRONG — fix first** |
| Impersonating other brands | Own brand “The Kashmir Weaver”; no third-party brand mimic found in GMC titles | OK if true |
| Unsupported “official / GI / certified” implication | TrustStrip / FAQ: “GI certificate available on demand”; About qualifies “not every product ships with certificate” | **Caution** — OK only if you can actually supply GI docs when asked |
| Phishing / fake retailer UX | Professional Hydrogen store + HTTPS | OK |
| Deny returns despite published policy | Returns policy live; cancellation fees (gateway) disclosed | OK if you honour it |

### 2. Misleading or unrealistic offers

| Policy risk | Our status | Verdict |
| --- | --- | --- |
| False / exaggerated product claims | Feed + PDP language: “authentic cashmere”, titles “Cashmere … Pashmina”, material strings like **“100% Pure Pashmina (Cashmere)”** on live catalog JSON | **HIGH RISK** if fibre isn’t accurately described / documented |
| Miracle / health claims | Not found | OK |

**Why this matters for pashmina:** Google treats inaccurate material / authenticity claims as misrepresentation. Using **Cashmere** and **Pashmina** interchangeably plus **100% Pure** without lab/GI documentation is a common trigger for textile merchants.

**Fix direction:** Align Shopify product titles, descriptions, `material` / metafields, and Merchant attributes to one accurate fibre story (and keep GI as “available on request” only where true).

### 3. Omission of relevant information

| Policy risk | Our status | Verdict |
| --- | --- | --- |
| Missing / hard-to-find shipping | `/shipping` detailed | OK |
| Missing / unclear returns | `/returns` detailed + cancellation rules | OK |
| Missing terms / payment clarity | `/terms` + FAQ (Shopify checkout methods) | OK |
| Full expense before purchase | Shipping: India complimentary / intl free over $200; cart should say calculated at checkout | **Partial** — confirm cart copy after redeploy; never show blanket “Complimentary” if intl can be charged |

### 4. Unavailable offers

| Policy risk | Our status | Verdict |
| --- | --- | --- |
| Promote out-of-stock / dead deals | Availability in sample feed: `in stock` | Monitor |
| CTA not achievable on landing page | Checkout via Shopify | OK |

---

## Merchant Center API findings (Google)

Sample product status (and same pattern for others):

- **Issue:** `policy_enforcement_account_disapproval`  
- **Servability:** disapproved  
- **Resolution:** `merchant_action`  
- **Countries:** not only India — **broad multi-country disapproval** on Shopping / Display / SurfacesAcrossGoogle  
- **Detail:** setup and policy issues; verify, fix, appeal  

Additional (secondary) issues seen on sample SKUs:

| Code | Meaning | Action |
| --- | --- | --- |
| `invalid_currency_for_country` (e.g. KR) | USD feed vs local market | Limit markets or localize currency |
| `missing_shipping_no_shipping_service_defined_for_country` | No shipping for that country | Add shipping or disable country |
| `missing_business_registration_number` (KR) | Korea-specific BRN | Don’t target KR without registration |

**Account NAP (GMC):** name, H 10-A address, Gmail, +919796105623, website `.shop`, GBP **active** — consistent with the **website**, **not** with Shopify billing address.

**Products:** brand `The Kashmir Weaver`, prices USD, `identifierExists: false` (no GTIN) — not the account suspension root cause, but weak for Shopping quality.

---

## Shopify CLI findings

```text
shop.name: The Kashmir Weaver
shop.email / contactEmail: thekashmirweaver@gmail.com
shop.currencyCode: USD
shop.primaryDomain: https://70yuey-sr.myshopify.com   ← Admin primary; headless uses .shop
shop.billingAddress: 17 Batamaloo - Tengpur Road Mominabad  ← MISMATCH
custom.contact metafield: Gmail + +91-9796105623  ← matches site
```

Headless domain strategy (`.shop` as GMC website) is fine **if** Shopify Online Store isn’t the indexed destination. The **billing address mismatch** is not fine.

---

## Best practices from the policy page (score)

| Google best practice | Status |
| --- | --- |
| Deliver what customers paid for | Operational — cannot verify from code |
| Describe business on website (About) | Pass |
| Use your own branding | Pass |
| Avoid misleading other-brand identity | Pass |
| Be clear about partnerships / certifications | Caution on GI |
| Be qualified / keep certifications current | Provide GI/docs when claimed |
| Complete advertiser / identity verification | **Blocking review button** |
| Appeal with proof | Blocked until “additional issues” cleared |

---

## What we are *not* doing wrong (relative to this policy)

- Fake government seals / phishing checkout — not observed  
- Missing Shipping / Returns / Privacy / Terms — present and detailed  
- No HTTPS — HTTPS + HSTS present  
- Merchant Center empty business info — filled and matches site (except Shopify Admin address)  
- GBP missing — linked and active  

---

## Ordered fix list (do in this order)

1. **Unify the legal address** across Shopify Admin, site (`business.ts`), GMC, GBP, Payments, and GST docs.  
2. **Complete Identity Verification** in Merchant Center (documents must match that address + legal name).  
3. Soften / correct **fibre claims** in Shopify product data (remove or qualify “100% Pure Pashmina (Cashmere)” unless provable).  
4. **Redeploy Oxygen** so live matches git (drop orphan `/cancellation` if still live).  
5. Narrow GMC **target countries** to those with correct currency + shipping (or fix shipping/currency).  
6. After IDV unlocks: **Request review** with a short note that address/NAP were unified and policies are live on `.shop`.  
7. Optional: domain email for support (Gmail is allowed if consistent, but weaker for trust).

---

## Appeal tip (from Google’s article)

Do **not** delete the Merchant Center account and recreate it.  
When you can appeal: explain the single legal entity, attach GST + address proof matching the site, and confirm you are not impersonating another brand.

---

## Related

- Broader storefront checklist: [gmc-misrepresentation-audit.md](./gmc-misrepresentation-audit.md)  
- Domains: [seo-and-domains.md](./seo-and-domains.md)  
- GMC credentials: [google-merchant-credentials.md](./google-merchant-credentials.md)
