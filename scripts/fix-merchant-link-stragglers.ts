/**
 * Fix remaining Merchant Center products whose `link` still points to .shop.
 * Targets only stragglers and writes link + canonicalLink to supplemental feed.
 *
 * Usage: npx tsx scripts/fix-merchant-link-stragglers.ts
 */
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { googleContentToken } from "./lib/google-auth.js";

const ROOT = resolve(import.meta.dirname, "..");

function loadEnv() {
  const envPath = resolve(ROOT, ".env");
  if (!existsSync(envPath)) return;
  for (const line of readFileSync(envPath, "utf8").split("\n")) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m && !(m[1] in process.env)) {
      process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
    }
  }
}
loadEnv();

const MERCHANT = process.env.MERCHANT_ID || "5825882191";
const STORE = (process.env.PUBLIC_STORE_URL || "https://thekashmirweaver.com").replace(/\/$/, "");
const SUPPLEMENTAL_ID = "10687165145";
const CREDS =
  process.env.GOOGLE_APPLICATION_CREDENTIALS ||
  resolve(ROOT, "secrets/google/merchant-service-account.json");

async function api(url: string, init?: RequestInit, attempt = 0) {
  const token = await googleContentToken(CREDS);
  const res = await fetch(url, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...(init?.headers || {}),
    },
  });
  const text = await res.text();
  const data = text ? JSON.parse(text) : {};
  if ((res.status === 429 || res.status >= 500) && attempt < 4) {
    await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)));
    return api(url, init, attempt + 1);
  }
  if (!res.ok) throw new Error(`${res.status}: ${text.slice(0, 500)}`);
  return data;
}

async function main() {
  const stragglers: Array<{
    id: string;
    offerId: string;
    feedLabel: string;
    link?: string;
  }> = [];
  let pageToken: string | undefined;

  do {
    const q = new URLSearchParams({ maxResults: "250" });
    if (pageToken) q.set("pageToken", pageToken);
    const data = await api(
      `https://shoppingcontent.googleapis.com/content/v2.1/${MERCHANT}/products?${q}`,
    );
    for (const p of data.resources || []) {
      if (p.link?.includes("thekashmirweaver.shop")) {
        stragglers.push({
          id: p.id,
          offerId: p.offerId,
          feedLabel: p.feedLabel || p.id.split(":")[2],
          link: p.link,
        });
      }
    }
    pageToken = data.nextPageToken;
    process.stdout.write(`\rScanned, stragglers: ${stragglers.length}`);
  } while (pageToken);
  console.log();

  console.log(`Stragglers with .shop link: ${stragglers.length}`);
  if (!stragglers.length) return;

  let ok = 0;
  for (const p of stragglers) {
    const m = p.link?.match(/\/products\/([^?]+)\?variant=(\d+)/);
    if (!m) continue;
    const [, handle, variantId] = m;
    const link = `${STORE}/products/${handle}?variant=${variantId}`;
    const canonicalLink = `${STORE}/products/${handle}`;

    await api(
      `https://merchantapi.googleapis.com/products/v1/accounts/${MERCHANT}/productInputs:insert?dataSource=accounts/${MERCHANT}/dataSources/${SUPPLEMENTAL_ID}`,
      {
        method: "POST",
        body: JSON.stringify({
          offerId: p.offerId,
          contentLanguage: "en",
          feedLabel: p.feedLabel,
          productAttributes: { link, canonicalLink },
        }),
      },
    );
    ok++;
    if (ok % 25 === 0) process.stdout.write(`\rFixed ${ok}/${stragglers.length}`);
  }

  console.log(`\nDone. fixed=${ok}/${stragglers.length}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
