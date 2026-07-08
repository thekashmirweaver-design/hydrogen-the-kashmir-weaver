#!/usr/bin/env python3
"""Bulk upload shades from palette.json as individual Shopify products."""

import json
import base64
import time
import os
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path

import requests

API_VERSION = "2025-01"
PALETTE_PATH = os.environ.get(
    "PALETTE_PATH",
    "/Users/iambqc/Desktop/test/output/set0/palette.json",
)
COLLECTION_ID = 493311426775
PRODUCT_TYPE = "Plain"
VENDOR = "The Kashmir Weaver"
EXISTING_CODES = set(
    code.strip()
    for code in os.environ.get("EXISTING_CODES", "").split(",")
    if code.strip()
)

# Scarves & Shawls — see docs/product-template.md
CATEGORY_ID = "gid://shopify/TaxonomyCategory/aa-2-26"

# Shopify standard product taxonomy (shopify.* namespace)
SHARED_SHOPIFY_CATEGORY_METAFIELDS = {
    "scarf-shawl-style": [
        "gid://shopify/Metaobject/200509718743",
        "gid://shopify/Metaobject/200509751511",
        "gid://shopify/Metaobject/200509784279",
        "gid://shopify/Metaobject/200509817047",
    ],
    "fabric": ["gid://shopify/Metaobject/200509685975"],
    "target-gender": ["gid://shopify/Metaobject/200509653207"],
    "accessory-size": [
        "gid://shopify/Metaobject/200385528023",
        "gid://shopify/Metaobject/200385593559",
        "gid://shopify/Metaobject/200385626327",
    ],
}

COLOR_PATTERN_TYPE = "shopify--color-pattern"
PATTERN_SOLID = "gid://shopify/TaxonomyValue/2874"
COLOR_PATTERN_CACHE_FILE = Path(__file__).resolve().parent / "color_pattern_cache.json"

# Shopify Scarves & Shawls → Color attribute values
TAXONOMY_COLORS = {
    "White": "gid://shopify/TaxonomyValue/3",
    "Beige": "gid://shopify/TaxonomyValue/6",
    "Black": "gid://shopify/TaxonomyValue/1",
    "Blue": "gid://shopify/TaxonomyValue/2",
    "Bronze": "gid://shopify/TaxonomyValue/657",
    "Brown": "gid://shopify/TaxonomyValue/7",
    "Clear": "gid://shopify/TaxonomyValue/17",
    "Gold": "gid://shopify/TaxonomyValue/4",
    "Gray": "gid://shopify/TaxonomyValue/8",
    "Green": "gid://shopify/TaxonomyValue/9",
    "Multicolor": "gid://shopify/TaxonomyValue/2865",
    "Navy": "gid://shopify/TaxonomyValue/15",
    "Orange": "gid://shopify/TaxonomyValue/10",
    "Pink": "gid://shopify/TaxonomyValue/11",
    "Purple": "gid://shopify/TaxonomyValue/12",
    "Red": "gid://shopify/TaxonomyValue/13",
    "Rose gold": "gid://shopify/TaxonomyValue/16",
    "Silver": "gid://shopify/TaxonomyValue/5",
    "Yellow": "gid://shopify/TaxonomyValue/14",
}

# palette.json family prefix (left of " / ") → Shopify taxonomy color name
FAMILY_PREFIX_TO_COLOR = {
    "White": "White",
    "Yellow": "Yellow",
    "Orange": "Orange",
    "Green": "Green",
    "Pink": "Pink",
    "Magenta": "Pink",
    "Red": "Red",
    "Red-Orange": "Orange",
    "Purple": "Purple",
    "Grey": "Gray",
    "Blue": "Blue",
    "Brown": "Brown",
    "Maroon": "Red",
    "Taupe": "Brown",
    "Gold": "Gold",
}


def load_env_file() -> None:
    env_path = Path(__file__).resolve().parent / ".env"
    if not env_path.exists():
        return
    for line in env_path.read_text().splitlines():
        trimmed = line.strip()
        if not trimmed or trimmed.startswith("#") or "=" not in trimmed:
            continue
        key, value = trimmed.split("=", 1)
        key = key.strip()
        value = value.strip().strip('"').strip("'")
        os.environ.setdefault(key, value)


load_env_file()

STORE = os.environ.get("PUBLIC_STORE_DOMAIN", "")
API_TOKEN = os.environ.get("SHOPIFY_ADMIN_ACCESS_TOKEN", "")
BASE = f"https://{STORE}/admin/api/{API_VERSION}"
GRAPHQL_URL = f"https://{STORE}/admin/api/{API_VERSION}/graphql.json"
HEADERS = {
    "X-Shopify-Access-Token": API_TOKEN,
    "Content-Type": "application/json",
}

SHADE_CARD_URL = "https://drive.google.com/file/d/1uBrCxSpr0LCpOW9MMhCPXj-VcVgHR4SE/view"

BODY_HTML_TEMPLATE = """<p>Experience the timeless beauty of our <strong>{colour_name} Cashmere Pashmina</strong>, expertly handwoven in Kashmir using the finest cashmere. Every piece is crafted by skilled artisans, preserving centuries of tradition while offering exceptional softness, lightweight comfort, and natural warmth.</p>
<p>The elegant {colour_name} shade adds a refined touch to any wardrobe, making it a versatile accessory for both everyday wear and special occasions. Its minimalist solid design showcases the luxurious texture of authentic cashmere, allowing the beauty of the craftsmanship to shine through.</p>
<p>Each Pashmina is individually woven, ensuring subtle variations that make every piece unique. Whether styled as a shawl, wrap, or scarf, it offers effortless sophistication and year-round comfort.</p>
<h3>Highlights</h3>
<ul>
<li>Handwoven in Kashmir</li>
<li>Premium authentic cashmere</li>
<li>Elegant {colour_name} solid finish</li>
<li>Soft, lightweight, and naturally warm</li>
<li>Timeless design for every season</li>
<li>Crafted by master Kashmiri artisans</li>
<li>Ideal for gifting and everyday luxury</li>
</ul>
<p><em>Images shown here may differ slightly from the actual shades. Check our <a href="{shade_card_url}" target="_blank" rel="noopener noreferrer">shade card</a> to compare product code <strong>{code}</strong> with the selected code.</em></p>"""

DESC_TAG_TEMPLATE = "Discover our Luxury Solid {colour_name} Cashmere Pashmina, handwoven in Kashmir by skilled artisans using the finest cashmere. Exceptionally soft, lightweight, warm, and designed for timeless elegance."

SHARED_CUSTOM_METAFIELDS = [
    ("weave", "single_line_text_field", "Handloom · 4 to 7 days weaving"),
    ("material", "single_line_text_field", "100% Kashmir Pashmina Cashmere"),
    ("origin", "single_line_text_field", "Srinagar, Kashmir, India"),
    ("care", "single_line_text_field", "Dry clean only — natural fibres require gentle care."),
    ("story", "multi_line_text_field", "Every thread carries the silence of the Changthang plateau — a test passage for the story section, set in italic beneath the fold."),
    ("short_description", "single_line_text_field", "Each Pashmina is individually woven, ensuring subtle variations that make every piece unique. Whether styled as a shawl, wrap, or scarf, it offers effortless sophistication and year-round comfort."),
    ("guarantees_delivery", "json", json.dumps([{"title":"Ships within","body":"24 hours of order placement"},{"title":"International delivery","body":"5–10 working days"},{"title":"India delivery","body":"2–5 working days"},{"title":"Free shipping","body":"On orders over $200"},{"title":"Ships from","body":"Kashmir, India"}])),
    ("returns_care", "json", json.dumps([{"text":"100% refund for any manufacturing defect"},{"text":"All products quality-checked before dispatch"},{"text":"See Terms & Conditions for details","href":"/terms"},{"text":"Dry clean only — natural fibres require gentle care."},{"text":"Slight variations are a mark of hand craftsmanship"}])),
    ("show_colour_studio", "boolean", "false"),
    ("shade_palette", "json", "[]"),
    ("limited", "boolean", "false"),
]


def parse_family(family: str) -> tuple[str, str]:
    if " / " in family:
        parts = family.split(" / ")
        return parts[1].strip(), parts[0].strip()
    return family.strip(), family.strip()


def make_colour_name(color: str, family: str) -> str:
    return color if color == family else f"{color} {family}"


def make_title(colour_name: str) -> str:
    return f"Handwoven Luxury Solid {colour_name} Cashmere Pashmina Shawl"


def make_handle(colour_name: str) -> str:
    return f"{colour_name.lower().replace(' ', '-')}-cashmere-pashmina-shawl-handwoven-in-kashmir"


def make_sku(code: str, size_suffix: str) -> str:
    return f"TKW-SLD-{code.replace('-', '')}-{size_suffix}"


def make_tags(colour_name: str) -> list[str]:
    return ["pashmina", "plain", "solid", colour_name.lower().replace(" ", "-")]


def encode_image(path: str) -> str:
    with open(path, "rb") as f:
        return base64.b64encode(f.read()).decode("utf-8")


def request_with_retries(method: str, url: str, *, retries: int = 5, backoff: int = 5, **kwargs):
    last_error = None
    for attempt in range(retries):
        try:
            return requests.request(method, url, **kwargs)
        except (requests.exceptions.ConnectionError, requests.exceptions.Timeout) as err:
            last_error = err
            if attempt + 1 >= retries:
                break
            wait = backoff * (attempt + 1)
            print(f"\n  RETRY {attempt + 1}/{retries - 1} ({type(err).__name__}), waiting {wait}s ... ", end="", flush=True)
            time.sleep(wait)
    raise last_error


def admin_graphql(query: str, variables: dict | None = None) -> dict:
    resp = request_with_retries(
        "POST",
        GRAPHQL_URL,
        headers=HEADERS,
        json={"query": query, "variables": variables or {}},
        timeout=60,
    )
    resp.raise_for_status()
    payload = resp.json()
    if payload.get("errors"):
        raise RuntimeError(json.dumps(payload["errors"]))
    return payload


def taxonomy_color_name_for_shade(shade: dict) -> str:
    family = shade["family"]
    prefix = family.split(" / ")[0].strip() if " / " in family else family.strip()
    color = FAMILY_PREFIX_TO_COLOR.get(prefix, prefix)
    if color in TAXONOMY_COLORS:
        return color
    lowered = family.lower()
    if "white" in lowered or "cream" in lowered or "ivory" in lowered:
        return "White"
    if "grey" in lowered or "gray" in lowered or "silver" in lowered or "charcoal" in lowered:
        return "Gray"
    if "navy" in lowered:
        return "Navy"
    if "gold" in lowered:
        return "Gold"
    raise ValueError(f"No taxonomy color mapping for family '{family}'")


def load_color_pattern_cache() -> dict[str, str]:
    if not COLOR_PATTERN_CACHE_FILE.exists():
        return {}
    return json.loads(COLOR_PATTERN_CACHE_FILE.read_text())


def save_color_pattern_cache(cache: dict[str, str]) -> None:
    COLOR_PATTERN_CACHE_FILE.write_text(json.dumps(cache, indent=2, sort_keys=True))


def color_pattern_handle(color_name: str) -> str:
    return f"{color_name.lower().replace(' ', '-')}-solid"


def ensure_color_pattern_metaobject(color_name: str) -> str:
    """Return metaobject GID for color + solid pattern, creating if needed."""
    cache = load_color_pattern_cache()
    if color_name in cache:
        return cache[color_name]

    taxonomy_gid = TAXONOMY_COLORS[color_name]
    handle = color_pattern_handle(color_name)
    result = admin_graphql(
        """
        mutation UpsertColorPattern($handle: MetaobjectHandleInput!, $metaobject: MetaobjectUpsertInput!) {
          metaobjectUpsert(handle: $handle, metaobject: $metaobject) {
            metaobject { id displayName }
            userErrors { field message }
          }
        }
        """,
        {
            "handle": {"type": COLOR_PATTERN_TYPE, "handle": handle},
            "metaobject": {
                "fields": [
                    {"key": "label", "value": color_name},
                    {
                        "key": "color_taxonomy_reference",
                        "value": json.dumps([taxonomy_gid]),
                    },
                    {"key": "pattern_taxonomy_reference", "value": PATTERN_SOLID},
                ]
            },
        },
    )
    upsert = result["data"]["metaobjectUpsert"]
    if upsert["userErrors"]:
        raise RuntimeError(json.dumps(upsert["userErrors"]))
    metaobject_gid = upsert["metaobject"]["id"]
    cache[color_name] = metaobject_gid
    save_color_pattern_cache(cache)
    return metaobject_gid


def shopify_category_metafields_for_shade(shade: dict) -> dict[str, list[str]]:
    color_name = taxonomy_color_name_for_shade(shade)
    color_pattern_gid = ensure_color_pattern_metaobject(color_name)
    return {
        **SHARED_SHOPIFY_CATEGORY_METAFIELDS,
        "color-pattern": [color_pattern_gid],
    }


def set_product_category_and_taxonomy(product_id: int, shade: dict) -> bool:
    """Set Shopify product category and shopify.* taxonomy metafields."""
    product_gid = f"gid://shopify/Product/{product_id}"
    color_name = taxonomy_color_name_for_shade(shade)

    category_result = admin_graphql(
        """
        mutation SetProductCategory($input: ProductInput!) {
          productUpdate(input: $input) {
            userErrors { field message }
          }
        }
        """,
        {"input": {"id": product_gid, "category": CATEGORY_ID}},
    )
    category_errors = category_result["data"]["productUpdate"]["userErrors"]
    if category_errors:
        print(f"  WARN category: {category_errors}")
        return False

    category_metafields = shopify_category_metafields_for_shade(shade)
    metafields = [
        {
            "ownerId": product_gid,
            "namespace": "shopify",
            "key": key,
            "type": "list.metaobject_reference",
            "value": json.dumps(value),
        }
        for key, value in category_metafields.items()
    ]
    metafield_result = admin_graphql(
        """
        mutation SetCategoryMetafields($metafields: [MetafieldsSetInput!]!) {
          metafieldsSet(metafields: $metafields) {
            userErrors { field message }
          }
        }
        """,
        {"metafields": metafields},
    )
    metafield_errors = metafield_result["data"]["metafieldsSet"]["userErrors"]
    if metafield_errors:
        print(f"  WARN taxonomy metafields: {metafield_errors}")
        return False

    print(f"  category color: {color_name}")
    return True


def create_product(shade: dict) -> dict | None:
    code = shade["code"]
    family = shade["family"]
    full_path = shade["full"]
    zoom_path = shade["zoom"]

    color, fam = parse_family(family)
    colour_name = make_colour_name(color, fam)
    title = make_title(colour_name)
    handle = make_handle(colour_name)
    tags = make_tags(colour_name)
    body_html = BODY_HTML_TEMPLATE.format(
        colour_name=colour_name,
        code=code,
        shade_card_url=SHADE_CARD_URL,
    )
    desc_tag = DESC_TAG_TEMPLATE.format(colour_name=colour_name)

    if not os.path.exists(full_path):
        print(f"  WARN: Image not found: {full_path}")
        return None
    if not os.path.exists(zoom_path):
        print(f"  WARN: Image not found: {zoom_path}")
        return None

    full_b64 = encode_image(full_path)
    zoom_b64 = encode_image(zoom_path)

    payload = {
        "product": {
            "title": title,
            "handle": handle,
            "body_html": body_html,
            "vendor": VENDOR,
            "product_type": PRODUCT_TYPE,
            "status": "unlisted",
            "tags": ",".join(tags),
            "options": [
                {"name": "Color", "values": [colour_name]},
                {"name": "Accessory size", "values": [
                    "Stole (70 X 200cm)", "Shawl (100×200cm)", "Square Scarf (137×137cm)"
                ]},
            ],
            "variants": [
                {"option1": colour_name, "option2": "Stole (70 X 200cm)",       "price": "130.00", "compare_at_price": "195.00", "sku": make_sku(code, "S"), "weight": 100, "weight_unit": "g", "inventory_management": None, "inventory_policy": "continue", "requires_shipping": True, "fulfillment_service": "manual"},
                {"option1": colour_name, "option2": "Shawl (100×200cm)",        "price": "190.00", "compare_at_price": "285.00", "sku": make_sku(code, "M"), "weight": 180, "weight_unit": "g", "inventory_management": None, "inventory_policy": "continue", "requires_shipping": True, "fulfillment_service": "manual"},
                {"option1": colour_name, "option2": "Square Scarf (137×137cm)", "price": "190.00", "compare_at_price": "285.00", "sku": make_sku(code, "L"), "weight": 180, "weight_unit": "g", "inventory_management": None, "inventory_policy": "continue", "requires_shipping": True, "fulfillment_service": "manual"},
            ],
            "images": [
                {"attachment": full_b64, "filename": f"set0-shade-{code}.png",       "position": 1, "alt": f"{colour_name} Cashmere Pashmina Shawl — flat view"},
                {"attachment": zoom_b64, "filename": f"set0-shade-{code}-zoom.png",   "position": 2, "alt": f"{colour_name} Cashmere Pashmina Shawl — close-up texture zoom"},
            ],
            "metafields_global_title_tag": title,
            "metafields_global_description_tag": desc_tag,
        }
    }

    resp = request_with_retries(
        "POST",
        f"{BASE}/products.json",
        headers=HEADERS,
        json=payload,
        timeout=300,
    )
    if resp.status_code not in (200, 201):
        print(f"  ERROR: {resp.status_code} {resp.text[:300]}")
        return None
    return resp.json()["product"]


def create_metafields(product_id: int):
    def make_meta(namespace, key, mtype, value):
        resp = requests.post(f"{BASE}/metafields.json", headers=HEADERS, json={
            "metafield": {"namespace": namespace, "key": key, "value": value, "type": mtype, "owner_id": product_id, "owner_resource": "product"}
        }, timeout=30)
        return namespace, key, resp.status_code

    futures = []
    with ThreadPoolExecutor(max_workers=12) as pool:
        for key, mtype, value in SHARED_CUSTOM_METAFIELDS:
            futures.append(pool.submit(make_meta, "custom", key, mtype, value))
        for f in as_completed(futures):
            ns, key, code = f.result()
            if code not in (200, 201):
                pass  # silent — already logged too verbose


def add_to_collection(product_id: int):
    resp = requests.post(f"{BASE}/collects.json", headers=HEADERS, json={
        "collect": {"product_id": product_id, "collection_id": COLLECTION_ID}
    }, timeout=30)


def main():
    if not STORE or not API_TOKEN:
        raise SystemExit(
            "Missing PUBLIC_STORE_DOMAIN or SHOPIFY_ADMIN_ACCESS_TOKEN in .env"
        )

    MAX_PRODUCTS = int(os.environ.get("MAX_PRODUCTS", "0"))
    START_INDEX = int(os.environ.get("START_INDEX", "1"))
    CHECKPOINT_FILE = "upload_progress.json"

    with open(PALETTE_PATH) as f:
        palette = json.load(f)

    shades = palette["shades"]
    if MAX_PRODUCTS > 0:
        shades = shades[:MAX_PRODUCTS]

    total = len(shades)
    created = 0
    failed = 0
    skipped = 0

    # Load checkpoint if exists
    processed_codes = set(EXISTING_CODES)
    if os.path.exists(CHECKPOINT_FILE):
        with open(CHECKPOINT_FILE) as f:
            cp = json.load(f)
            processed_codes.update(cp.get("processed", []))
            created = cp.get("created", 0)
            failed = cp.get("failed", 0)
            print(f"Loaded checkpoint: {len(processed_codes)} processed codes, {created} created, {failed} failed")

    t0 = time.time()
    for idx, shade in enumerate(shades, 1):
        if idx < START_INDEX:
            continue

        code = shade["code"]
        family = shade["family"]
        color, fam = parse_family(family)
        colour_name = make_colour_name(color, fam)

        if code in processed_codes:
            skipped += 1
            print(f"[{idx}/{total}] {code} → {colour_name}  SKIP (already processed)")
            continue

        print(f"[{idx}/{total}] {code} → {colour_name} ... ", end="", flush=True)
        try:
            product = create_product(shade)
        except (requests.exceptions.ConnectionError, requests.exceptions.Timeout) as err:
            print(f"FAIL ({type(err).__name__})")
            failed += 1
            continue
        if not product:
            print("FAIL")
            failed += 1
            continue

        pid = product["id"]
        create_metafields(pid)
        if not set_product_category_and_taxonomy(pid, shade):
            print("FAIL (category/taxonomy)")
            failed += 1
            continue
        add_to_collection(pid)
        created += 1
        processed_codes.add(code)
        elapsed = time.time() - t0
        rate = created / elapsed * 60 if elapsed > 0 else 0
        print(f"✓ {pid}  ({rate:.0f}/min)")

        # Save checkpoint after every product
        with open(CHECKPOINT_FILE, "w") as f:
            json.dump({"processed": list(processed_codes), "created": created, "failed": failed}, f)

        if idx < total:
            time.sleep(0.5)

    elapsed = time.time() - t0
    print(f"\n{'='*40}")
    print(f"Created: {created}  Failed: {failed}  Skipped: {skipped}  Total: {total}")
    print(f"Time: {elapsed:.0f}s  Rate: {created/elapsed*60:.0f} products/min")


if __name__ == "__main__":
    main()
