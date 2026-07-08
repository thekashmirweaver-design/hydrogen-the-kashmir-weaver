#!/usr/bin/env python3
"""Set product category and shopify.* taxonomy metafields on all new products."""

import json
import time
import os
import requests

API_TOKEN = os.environ["SHOPIFY_ADMIN_API_TOKEN"]
STORE = "70yuey-sr.myshopify.com"
GRAPHQL = f"https://{STORE}/admin/api/2024-10/graphql.json"
REST = f"https://{STORE}/admin/api/2024-10"
HEADERS = {"X-Shopify-Access-Token": API_TOKEN, "Content-Type": "application/json"}
CATEGORY_ID = "gid://shopify/TaxonomyCategory/aa-2-26"

SHOPIFY_METAFIELDS = {
    "scarf-shawl-style": json.dumps(["gid://shopify/Metaobject/200509718743","gid://shopify/Metaobject/200509751511","gid://shopify/Metaobject/200509784279","gid://shopify/Metaobject/200509817047"]),
    "fabric": json.dumps(["gid://shopify/Metaobject/200509685975"]),
    "target-gender": json.dumps(["gid://shopify/Metaobject/200509653207"]),
    "accessory-size": json.dumps(["gid://shopify/Metaobject/200385626327","gid://shopify/Metaobject/200385593559","gid://shopify/Metaobject/200385528023"]),
    "color-pattern": json.dumps(["gid://shopify/Metaobject/200386543831"]),
}

SKIP_IDS = {9323672043735, 9324088197335}  # already have category + mfs


def get_all_products():
    products = []
    page_info = None
    while True:
        url = f"{REST}/products.json?fields=id,title&limit=250"
        if page_info:
            url += f"&page_info={page_info}"
        resp = requests.get(url, headers=HEADERS)
        data = resp.json()
        products.extend(data["products"])
        link_header = resp.headers.get("Link", "")
        if 'rel="next"' in link_header:
            for part in link_header.split(","):
                if 'rel="next"' in part:
                    page_info = part.split("page_info=")[1].split(">")[0]
                    break
        else:
            break
    return products


def fix_product(pid, retries=3):
    pid_gid = f"gid://shopify/Product/{pid}"

    for attempt in range(retries):
        try:
            q1 = """mutation { productUpdate(input: { id: "%s", category: "%s" }) { userErrors { field message } } }""" % (pid_gid, CATEGORY_ID)
            r1 = requests.post(GRAPHQL, headers=HEADERS, json={"query": q1}, timeout=30)
            if r1.status_code != 200:
                if attempt < retries - 1:
                    time.sleep(2)
                    continue
                return False

            mf_inputs = []
            for key, value in SHOPIFY_METAFIELDS.items():
                escaped = value.replace('"', '\\"')
                mf_inputs.append(
                    '{ ownerId: "%s", namespace: "shopify", key: "%s", type: "list.metaobject_reference", value: "%s" }'
                    % (pid_gid, key, escaped)
                )
            q2 = """mutation { metafieldsSet(metafields: [%s]) { userErrors { field message } } }""" % ",".join(mf_inputs)
            r2 = requests.post(GRAPHQL, headers=HEADERS, json={"query": q2}, timeout=30)
            if r2.status_code != 200 and attempt < retries - 1:
                time.sleep(2)
                continue
            return r2.status_code == 200
        except (ConnectionError, requests.exceptions.ConnectionError):
            if attempt < retries - 1:
                time.sleep(3)
                continue
            return False
    return False


def main():
    all_products = get_all_products()
    print(f"Total products: {len(all_products)}")

    CHECKPOINT = "fix_progress.json"
    fixed_ids = set()
    if os.path.exists(CHECKPOINT):
        with open(CHECKPOINT) as f:
            fixed_ids = set(json.load(f).get("fixed", []))

    done = 0
    failed = 0
    skipped = 0

    for p in all_products:
        pid = p["id"]
        if pid in SKIP_IDS:
            continue
        if pid in fixed_ids:
            skipped += 1
            continue

        print(f"[{done+failed+1}] {pid} ... ", end="", flush=True)
        if fix_product(pid):
            fixed_ids.add(pid)
            with open(CHECKPOINT, "w") as f:
                json.dump({"fixed": list(fixed_ids)}, f)
            done += 1
            print("✓")
        else:
            failed += 1
            print("FAIL")

        time.sleep(0.4)

    print(f"\nFixed: {done}  Failed: {failed}  Skipped (already OK): {skipped}")


if __name__ == "__main__":
    main()
