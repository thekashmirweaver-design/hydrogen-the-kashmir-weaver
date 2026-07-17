# Google Merchant Center — Misrepresentation Audit

**Account:** The Kashmir Weaver (`5822844259`)  
**Primary domain:** https://thekashmirweaver.shop  
**Issue:** Misrepresentation — prevents all products from showing in **India**  
**Audit date:** 2026-07-17  
**Repo commit (code):** `435432c` (cancellation page removed; **redeploy Oxygen** so live matches)

> Google’s Misrepresentation flag is an **account-level trust** issue, not a product-feed defect. Products are disapproved with `policy_enforcement_account_disapproval` until setup/policy issues are cleared and a review is requested.

---

## Executive verdict

| Area | Status | Notes |
| --- | --- | --- |
| Business identity on site | **Pass** | Name, address, phone, Gmail, GSTIN, hours on About + footer |
| Policies | **Pass** | Shipping, Returns (incl. cancellation), Privacy, Terms, FAQ |
| Merchant Center NAP | **Pass** | Matches site (phone format differs only by punctuation) |
| Google Business Profile | **Pass** | Linked, status `active` |
| HTTPS / professional storefront | **Pass** | HTTP/2 + HSTS; Hydrogen storefront |
| Dedicated `/cancellation` page | **N/A (by design)** | Removed from code; rules live under **Returns** / Terms / Shipping |
| Reviews / seller ratings | **Gap** | Thin / optional metafield ratings; no public review app |
| Payment methods listed pre-checkout | **Partial** | FAQ/Terms mention cards/UPI; no icons on cart |
| Identity verification + review unlock | **Blocked** | GMC: *“Fix additional issues before you request a review”* |
| Live vs git | **Action needed** | Production may still serve old `/cancellation` until Oxygen redeploy |

**Most likely remaining blocker:** Merchant Center **Identity Verification** (or other “additional issues”), not missing About/policy pages.

---

## Issue summary (from Merchant Center)

- **Claim / Critical:** Fix Misrepresentation that prevents products from showing on Google  
- **Scope:** Setup and policy issues affecting **all products** (India)  
- **Finding type:** Automated checks  
- **Review UI:** “I disagree with the issue” greyed out until additional issues are fixed  
- **Google guidance cited:**
  1. Transparency (identity, model, policies, how customers interact)
  2. Online reputation (reviews / badges)
  3. Professional design + SSL
  4. Business information in Merchant Center
  5. SEO / seller ratings / product data match store

Official policy: [Misrepresentation](https://support.google.com/merchants/answer/6150127) · [Request a review](https://support.google.com/merchants/answer/13585221)

---

## 1. Business identity (highest priority)

| Check | Live / code | Result |
| --- | --- | --- |
| Business name matches GMC | “The Kashmir Weaver” | ✅ |
| Physical address | House No. 10A, Lane No. 17, Ground Floor, Firdous Abad Colony, Batmaloo Bypass Road, Srinagar, J&K 190009, India | ✅ GST-aligned |
| Email | `thekashmirweaver@gmail.com` | ✅ |
| Phone | `+91-9796105623` (GMC: `+919796105623`) | ✅ |
| GSTIN | `01THFPS2915K1ZW` on About + footer + schema | ✅ |
| About Us | `/about` — who we are, studio, contact, hours, model (direct seller) | ✅ |
| Business model clarity | About states own atelier / not marketplace reseller | ✅ |

**Sources:** `app/lib/business.ts`, `app/lib/contact.ts`, `app/views/content/AboutView.tsx`, `app/components/gulriza/SiteFooter.tsx`

---

## 2. Contact page

| Check | Location | Result |
| --- | --- | --- |
| Contact surface | `/concierge` (primary; not `/contact`) | ✅ |
| Contact form | Concierge form → Resend email | ✅ |
| Email / phone / WhatsApp | Concierge + footer | ✅ |
| Address | Footer + About | ✅ |
| Business hours | Mon–Sat 10:00–18:00 IST | ✅ |
| Google Map embed | Not present | ⚠️ Optional |

---

## 3. Policies

| Policy | URL / surface | Result |
| --- | --- | --- |
| Shipping | `/shipping` | ✅ Detailed |
| Return & refund | `/returns` | ✅ Detailed; includes **order cancellation** (refund minus gateway fees) |
| Privacy | `/privacy` | ✅ |
| Terms | `/terms` | ✅ Includes cancellation § |
| Cancellation (dedicated page) | Removed from app (`435432c`); content in Returns/Terms/Shipping | ✅ Intentional |
| Payment policy | Covered in Terms + FAQ (Shopify checkout methods) | ✅ Partial (no standalone Payment Policy page) |

**Note:** Checklist item “Cancellation Policy” is satisfied by the **Order cancellation** section inside Returns (+ Terms), not a separate URL.

---

## 4. Product pages

| Check | Status |
| --- | --- |
| Price | ✅ |
| Availability | ✅ (Shopify / catalog) |
| Shipping info | ✅ PDP links + “Free shipping over $200” where applicable |
| Return policy link | ✅ `/returns` |
| Images / description / material | ✅ (varies by product quality) |
| Country of origin | ⚠️ Recommended — strengthen in feed + PDP metafields if missing |

**Pashmina claim caution:** Site uses “authentic hand-woven Kashmiri pashmina” and “GI on demand / on request.” Keep claims accurate; avoid absolute “100% Pure” language without documentation. See About GI section + TrustStrip.

---

## 5. About Us / heritage

| Check | Result |
| --- | --- |
| Who / where made | ✅ About + Heritage + Craft |
| Artisans / story | ✅ |
| Operating history | ⚠️ Soft — brand story present; no hard “founded year” if required for IDV docs |

---

## 6. Footer links

| Expected | Live (after redeploy) | Result |
| --- | --- | --- |
| About | `/about` (Our World) | ✅ |
| Contact | Concierge / Contact Us | ✅ |
| Shipping / Returns / Privacy / Terms | Legal column | ✅ |
| FAQ | Care column | ✅ |
| Social | Instagram / Facebook / Pinterest when metafield set | ✅ |
| Cancellation | Removed from footer in code | ✅ |

**Deploy gap:** Live HTML may still list `/cancellation` until Oxygen is redeployed from `main`.

---

## 7. Merchant Center business information

| Field | GMC API value | Match site? |
| --- | --- | --- |
| Name | The Kashmir Weaver | ✅ |
| Website | https://thekashmirweaver.shop | ✅ |
| Address | Same Srinagar address | ✅ |
| Support email | thekashmirweaver@gmail.com | ✅ |
| Phone | +919796105623 | ✅ |
| GBP link | Active | ✅ |
| Logo | Confirm in GMC UI | ⚠️ Manual check |
| GSTIN in GMC UI | Confirm Tax / business ID field | ⚠️ Add if field exists (shown on site) |

---

## 8. Domain consistency

| Host | Role | Status |
| --- | --- | --- |
| `thekashmirweaver.shop` | Primary (index / GMC) | ✅ |
| `.in` / `www` | 301 → `.shop` | ✅ (see `docs/seo-and-domains.md`) |
| `.com` | Phase 2 redirect / legacy | ⚠️ Keep off GMC as primary |
| Brand name | Consistent “The Kashmir Weaver” | ✅ |

---

## 9. Reviews / reputation

| Check | Result |
| --- | --- |
| Public review widget (Judge.me / Loox / Trustpilot) | ❌ Not wired as primary trust surface |
| Product rating metafields | Optional `reviews.rating` — thin |
| Trust badges | TrustStrip (authentic, GI on demand, shipping) | ⚠️ OK if accurate; not third-party reviews |
| Google seller ratings eligibility | Not ready without review program | ⚠️ Gap vs Google’s “reputation” bullet |

---

## 10. Payments

| Check | Result |
| --- | --- |
| Shopify secure checkout | ✅ |
| Methods disclosed | FAQ/Terms: cards, UPI, net banking, etc. | ✅ Partial |
| Manual bank-transfer-only store | No | ✅ |

---

## 11. HTTPS

| Check | Result |
| --- | --- |
| HTTPS | ✅ |
| HSTS | ✅ `strict-transport-security: max-age=31536000` |

---

## 12. Product feed match

| Check | Result |
| --- | --- |
| Account-level disapproval | All Shopping destinations for **IN** blocked by policy — feed quality secondary until review clears |
| Sample status | `policy_enforcement_account_disapproval` → `merchant_action` |
| Title / price / availability / images / brand | Must continue to match PDP exactly once listings resume |

---

## 13. Missing information (PDP / cart)

| Check | Result |
| --- | --- |
| Delivery time | ✅ In Shipping / FAQ |
| Shipping cost copy | Cart should say calculated at checkout (code fixed); verify after redeploy |
| Return eligibility | ✅ |
| Material / dimensions | Product-dependent — audit weak PDPs separately |

---

## Checklist scorecard (from the brief)

| Item | Status |
| --- | --- |
| Complete Contact page | ✅ Concierge |
| Detailed About Us | ✅ |
| Shipping Policy | ✅ |
| Return & Refund Policy | ✅ (+ cancellation rules) |
| Privacy Policy | ✅ |
| Terms & Conditions | ✅ |
| Business address displayed | ✅ |
| Phone displayed | ✅ |
| Support email displayed | ✅ |
| Merchant Center business info | ✅ (confirm logo + GSTIN in UI) |
| Product feed matches website | ⚠️ Secondary until Misrepresentation cleared |
| Reviews / seals | ⚠️ Gap |
| Identity verification done | ❌ Unlock review |
| Request review submitted | ❌ Blocked until additional issues fixed |

---

## Recommended action order

1. **Merchant Center → Misrepresentation → “Fix additional issues before you request a review from Google”**  
   Complete **Identity Verification** (govt ID + address proof + GST/registration matching NAP exactly).

2. **Redeploy Oxygen** from `main` so live site drops `/cancellation` and matches git (policies already seeded to Shopify).

3. Confirm GMC **Business information** logo + GSTIN (if field available).

4. Wait **24–48h** after deploy for recrawl (optional: Search Console URL Inspection on `/about`, `/returns`, `/concierge`).

5. When unlocked: **Request review** (or Shopify → Google & YouTube → Request re-review). Expect **3–14 days**.

6. **Optional trust boost:** install a real review app or collect Google reviews via GBP; avoid fake AggregateRating.

---

## Related docs

- [seo-and-domains.md](./seo-and-domains.md)  
- [deploy.md](./deploy.md)  
- [google-merchant-credentials.md](./google-merchant-credentials.md)  

## Key live URLs

- https://thekashmirweaver.shop/about  
- https://thekashmirweaver.shop/concierge  
- https://thekashmirweaver.shop/shipping  
- https://thekashmirweaver.shop/returns  
- https://thekashmirweaver.shop/privacy  
- https://thekashmirweaver.shop/terms  
- https://thekashmirweaver.shop/faq  
- Merchant Center diagnostics: `merchants.google.com/mc/products/diagnostics/accountissues?a=5822844259`
