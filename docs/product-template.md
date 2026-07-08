# Product Template — The Kashmir Weaver

Fill this out for each product you want to create via the Shopify Admin API or the static catalog.

---

## 1. Identity

| Field | Required | Example | Notes |
|-------|----------|---------|-------|
| `id` | yes | `prod_cream-cashmere-pashmina` | Internal ID for static catalog (not used in Admin API) |
| `handle` | yes | `cream-cashmere-pashmina-shawl-handwoven-in-kashmir` | URL slug — auto-generated from title if not provided |
| `title` | yes | `Handwoven Luxury Solid {Color} {Family} Cashmere Pashmina Shawl` | e.g. `Handwoven Luxury Solid Cream Yellow Cashmere Pashmina Shawl`. Color=right of `/`, Family=left of `/` from `family` field. If no slash, colour name used once. |

## 2. Pricing

| Field | Required | Example | Notes |
|-------|----------|---------|-------|
| `price` (Stole) | yes | `130.00` | Base price for smallest size |
| `price` (Shawl) | yes | `190.00` | |
| `price` (Square Scarf) | yes | `190.00` | |
| `compareAtPrice` (Stole) | no | `195.00` | Original/cost price — shows strikethrough on sale |
| `compareAtPrice` (Shawl) | no | `285.00` | |
| `compareAtPrice` (Square Scarf) | no | `285.00` | |

## 3. Variants & Options

**Category:** `Scarves & Shawls` (`gid://shopify/TaxonomyCategory/aa-2-26`)

**Category metafields** (`shopify` namespace — set automatically by `bulk_upload.py`):

| Key | Purpose |
|-----|---------|
| `scarf-shawl-style` | Shawl, stole, scarf, wrap |
| `fabric` | Cashmere |
| `target-gender` | Unisex |
| `accessory-size` | Stole, shawl, square scarf |
| `color-pattern` | Per-shade color + Solid pattern (mapped from palette `family`) |

**Size options** (always these 3):

| Option Value | SKU Suffix | Weight |
|--------------|------------|--------|
| `Stole (70 X 200cm)` | `-S` | 100 g |
| `Shawl (100×200cm)` | `-M` | 180 g |
| `Square Scarf (137×137cm)` | `-L` | 180 g |

**Color option** (one per product — each shade gets its own product):

| Value | Example |
|-------|---------|
| `Cream Yellow` | Color + Family from `family` field split on `/` |
| `Pastel Blue` | For `"Blue / Pastel"` → Color=`Pastel`, Family=`Blue` |
| `Yellow` | Single word — no slash, just use the colour |

**SKU pattern:** `TKW-SLD-{CODE}-{SIZE_SUFFIX}` where `{CODE}` = shade `code` from palette with hyphens removed (e.g. `1-L`→`1L`, `48-L`→`48L`), and `{SIZE_SUFFIX}` is `S`, `M`, or `L`.

**Variant fields per variant:**

| Field | Required | Example |
|-------|----------|---------|
| `price` | yes | `130.00` |
| `compare_at_price` | no | `195.00` |
| `sku` | yes | `TKW-SLD-1L-S` |
| `weight` | yes | `100` |
| `weight_unit` | yes | `g` |
| `inventory_management` | no | `null` (not tracked) | We do NOT track inventory — no limits |
| `inventory_quantity` | no | `0` | Not relevant when inventory is untracked |
| `inventory_policy` | no | `continue` | Allows selling regardless of stock |
| `requires_shipping` | no | `true` |
| `fulfillment_service` | no | `manual` |

## 4. Descriptions

| Field | Required | Example |
|-------|----------|---------|
| `body_html` | yes | Full HTML description |
| `shortDescription` | yes | Brief summary (~160 chars). Source: `custom.short_description` metafield |
| `story` | no | Brand narrative / backstory. Source: `custom.story` metafield |

**Product Description template:**

```html
<p>Experience the timeless beauty of our <strong>{Color} {Family} Cashmere Pashmina</strong>,
expertly handwoven in Kashmir using the finest cashmere. Every piece is crafted by
skilled artisans, preserving centuries of tradition while offering exceptional softness,
lightweight comfort, and natural warmth.</p>

<p>The elegant {Color} {Family} shade adds a refined touch to any wardrobe, making it a versatile
accessory for both everyday wear and special occasions. Its minimalist solid design showcases
the luxurious texture of authentic cashmere, allowing the beauty of the craftsmanship to shine through.</p>

<p>Each Pashmina is individually woven, ensuring subtle variations that make every piece unique.
Whether styled as a shawl, wrap, or scarf, it offers effortless sophistication and year-round comfort.</p>

<h3>Highlights</h3>
<ul>
  <li>Handwoven in Kashmir</li>
  <li>Premium authentic cashmere</li>
  <li>Elegant {Color} {Family} solid finish</li>
  <li>Soft, lightweight, and naturally warm</li>
  <li>Timeless design for every season</li>
  <li>Crafted by master Kashmiri artisans</li>
  <li>Ideal for gifting and everyday luxury</li>
</ul>

<p><em>Images shown here may differ slightly from the actual shades. Check our
<a href="https://drive.google.com/file/d/1uBrCxSpr0LCpOW9MMhCPXj-VcVgHR4SE/view" target="_blank" rel="noopener noreferrer">shade card</a>
to compare product code <strong>{CODE}</strong> with the selected code.</em></p>
```

## 5. SEO

| Field | Example |
|-------|---------|
| `metafields_global_title_tag` | `Handwoven Luxury Solid {Color} {Family} Cashmere Pashmina Shawl` |
| `metafields_global_description_tag` | `Discover our Luxury Solid {Color} {Family} Cashmere Pashmina, handwoven in Kashmir by skilled artisans using the finest cashmere. Exceptionally soft, lightweight, warm, and designed for timeless elegance.` |

## 6. Media

| Field | Required | Notes |
|-------|----------|-------|
| Images | yes | Upload 2+ images per product |
| Alt text | recommended | Describe the image content |

**Convention:** 1 flat/lay image + 1 zoom/texture close-up per shade.

## 7. Attributes

| Field | Required | Example | Source |
|-------|----------|---------|--------|
| `product_type` | no | `Plain` | Shopify product type |
| `vendor` | no | `The Kashmir Weaver` | |
| `tags` | no | `["pashmina", "plain", "solid", "cream"]` | Free-form strings |
| `material` | yes | `100% pure pashmina cashmere` | `custom.material` metafield |
| `origin` | yes | `Srinagar, Kashmir` | `custom.origin` metafield |
| `weave` | yes | `Plain hand-woven` | `custom.weave` metafield |
| `care` | no | `Dry clean only. Store flat in a cool, dry place.` | `custom.care` metafield |

**Observed product types:** `Plain`, `Pashmina Shawl`, `Bridal Pashmina Shawl`, `Kani Pashmina Shawl`, `Pashmina Stole`, `Reversible Pashmina Shawl`, `Pashmina Scarf`

**Observed tags:** `pashmina`, `plain`, `solid`, `jamawar-embroidery`, `sozni`, `floral`, `zardozi`, `limited`, `paisley`, `jamawar`, `bridal`, `archive`, `naturally-dyed`, `kani-pashmina`, `kani`, `buta`, `stole`, `reversible-pashmina`, `reversible`, `double-face`, `scarf`, `jacquard`, `solid-pashmina`

## 8. Inventory

| Field | Required | Example |
|-------|----------|---------|
| `stock` | yes | `in` or `out` (used internally) |
| `inventory_management` | yes | `shopify` |
| `inventory_quantity` | yes | `25` (per variant) |
| `limited` | no | `true` / `false`. Source: `custom.limited` metafield |
| `stockQty` | no | `5`. Source: `custom.stock_qty` metafield |

## 9. Metafields (`custom.*` namespace)

| Key | Type | Required | Example |
|-----|------|----------|---------|
| `custom.story` | single_line_text_field | no | `"Handwoven by artisans in Srinagar..."` |
| `custom.short_description` | single_line_text_field | yes | `"A luxuriously soft Cream Cashmere Pashmina, handwoven in Kashmir."` |
| `custom.material` | single_line_text_field | yes | `"100% pure pashmina cashmere"` |
| `custom.origin` | single_line_text_field | yes | `"Srinagar, Kashmir"` |
| `custom.weave` | single_line_text_field | yes | `"Plain hand-woven"` |
| `custom.care` | single_line_text_field | no | `"Dry clean only."` |
| `custom.featured` | boolean | no | `"true"` — adds to homepage curation |
| `custom.limited` | boolean | no | `"true"` — flags limited edition |
| `custom.stock_qty` | number_integer | no | `"5"` |
| `custom.show_colour_studio` | boolean | no | `"true"` — enables "Try Colours" on PDP |
| `custom.guarantees_delivery` | json | no | `[{"title":"Ships within","body":"24 hours"}]` |
| `custom.returns_care` | json | no | `[{"text":"100% refund for defects","href":"/returns"}]` |
| `custom.shade_palette` | json | no | `[{"code":"1-L","hex":"#FCE6C9","family":"Cream"}]` |

## 10. Collections

| Field | Required | Example | Available Handles |
|-------|----------|---------|-------------------|
| `collectionSlug` | yes | `solids` | `solids`, `sozni`, `tilla`, `kani`, `maheen-kari` |
| `collectionName` | yes | `Solid Pashmina` | |

## 11. Colour Studio (Solids Only)

| Field | Required | Example |
|-------|----------|---------|
| `showColourStudio` | no | `true` |
| `solidRecolor` | no | `true` (auto-set for solids collection) |
| `shades` | no | `[{code: "1-L", hex: "#FCE6C9", family: "Cream"}, ...]` |

Shade palette is defined in `app/models/static/shades.ts` and `palette.txt` in output directories.

## 12. Completed Example (Cream Yellow — shade 1-L)

```json
{
  "product": {
    "title": "Handwoven Luxury Solid Cream Yellow Cashmere Pashmina Shawl",
    "body_html": "<p>Experience the timeless beauty of our <strong>Cream Yellow Cashmere Pashmina</strong>...</p>",
    "vendor": "The Kashmir Weaver",
    "product_type": "Plain",
    "status": "unlisted",
    "tags": ["pashmina", "plain", "solid", "cream-yellow"],
    "metafields_global_title_tag": "Handwoven Luxury Solid Cream Yellow Cashmere Pashmina Shawl",
    "metafields_global_description_tag": "Discover our Luxury Solid Cream Yellow Cashmere Pashmina, handwoven in Kashmir by skilled artisans using the finest cashmere. Exceptionally soft, lightweight, warm, and designed for timeless elegance.",
    "options": [
      {"name": "Color", "values": ["Cream Yellow"]},
      {"name": "Accessory size", "values": ["Stole (70 X 200cm)", "Shawl (100×200cm)", "Square Scarf (137×137cm)"]}
    ],
    "variants": [
      {"option1": "Cream Yellow", "option2": "Stole (70 X 200cm)",       "price": "130.00", "compare_at_price": "195.00", "sku": "TKW-SLD-1L-S", "weight": 100, "weight_unit": "g", "inventory_management": null, "inventory_policy": "continue", "inventory_quantity": 0, "requires_shipping": true, "fulfillment_service": "manual"},
      {"option1": "Cream Yellow", "option2": "Shawl (100×200cm)",        "price": "190.00", "compare_at_price": "285.00", "sku": "TKW-SLD-1L-M", "weight": 180, "weight_unit": "g", "inventory_management": null, "inventory_policy": "continue", "inventory_quantity": 0, "requires_shipping": true, "fulfillment_service": "manual"},
      {"option1": "Cream Yellow", "option2": "Square Scarf (137×137cm)", "price": "190.00", "compare_at_price": "285.00", "sku": "TKW-SLD-1L-L", "weight": 180, "weight_unit": "g", "inventory_management": null, "inventory_policy": "continue", "inventory_quantity": 0, "requires_shipping": true, "fulfillment_service": "manual"}
    ],
    "images": [
      {"attachment": "<base64>", "filename": "set0-shade-1-L.png",       "position": 1, "alt": "Cream Yellow Cashmere Pashmina Shawl — flat view"},
      {"attachment": "<base64>", "filename": "set0-shade-1-L-zoom.png",   "position": 2, "alt": "Cream Yellow Cashmere Pashmina Shawl — close-up texture zoom"}
    ]
  }
}
```
