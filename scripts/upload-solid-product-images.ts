/**
 * Analyze, order, and upload Solid Pashmina product images to Shopify.
 *
 * Order: light (product-clear first) → light (other) → dark (product-clear) → dark (other)
 *
 * Usage:
 *   tsx scripts/upload-solid-product-images.ts [images-dir] [--dry-run]
 *
 * Requires SHOPIFY_ADMIN_ACCESS_TOKEN with write_products (npm run auth:store + sync script).
 */
import {existsSync, readFileSync, statSync} from 'node:fs';
import {basename, extname, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';

const PRODUCT_HANDLE = 'cashmere-solid-pashmina-luxury-from-kashmir';
const DEFAULT_DIR = '/Users/iambqc/Downloads/THE KASHMIR WEAVER/PRODUCTS/SOLIDS';
const BATCH_SIZE = 5;

function loadEnvFile() {
  const root = resolve(fileURLToPath(new URL('.', import.meta.url)), '..');
  const envPath = resolve(root, '.env');
  if (!existsSync(envPath)) return;
  for (const line of readFileSync(envPath, 'utf8').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (process.env[key] === undefined) process.env[key] = value;
  }
}

function mimeType(filePath: string): string {
  const ext = extname(filePath).toLowerCase();
  if (ext === '.png') return 'image/png';
  return 'image/jpeg';
}

function analyzeAndOrder(imageDir: string): string[] {
  const script = `
import json, re
from pathlib import Path
from PIL import Image, ImageStat, ImageFilter

ROOT = Path(${JSON.stringify(imageDir)})
files = sorted([p for p in ROOT.rglob("*") if p.suffix.lower() in {".jpeg", ".jpg", ".png"}])
LIFESTYLE_KW = re.compile(r"artisan|weaving_room|atelier|weaving_luxury", re.I)
PRODUCT_KW = re.compile(r"Models_wearing|plain_pashmina|Gallery|pomelli_photoshoot|Kashmiri_Pashmina_Stoles|Models_with_.*Pashmina|Models_with_Pashmina|luxury_fashion", re.I)

def analyze(path):
    name = path.name
    with Image.open(path) as im:
        im = im.convert("RGB")
        w, h = im.size
        im_small = im.resize((400, max(1, int(400 * h / w))), Image.Resampling.LANCZOS)
        stat = ImageStat.Stat(im_small)
        luminance = sum(stat.mean) / 3.0
        cx1, cy1 = int(w * 0.25), int(h * 0.2)
        cx2, cy2 = int(w * 0.75), int(h * 0.85)
        center = im.crop((cx1, cy1, cx2, cy2)).resize((200, 200), Image.Resampling.LANCZOS)
        edges = center.convert("L").filter(ImageFilter.FIND_EDGES)
        edge_mean = ImageStat.Stat(edges).mean[0]
        var = sum(stat.stddev) / 3.0
    filename_score = 0
    if PRODUCT_KW.search(name): filename_score += 2
    if LIFESTYLE_KW.search(name): filename_score -= 2
    if "Gallery" in name: filename_score += 1
    if "plain_pashmina" in name: filename_score += 2
    if "pomelli_photoshoot" in name: filename_score += 3
    clarity = filename_score * 10 + edge_mean * 0.5 + min(var, 80) * 0.1
    return {"path": str(path), "luminance": luminance, "clarity": clarity, "filename_score": filename_score}

results = [analyze(p) for p in files]
median = sorted(r["luminance"] for r in results)[len(results)//2]
for r in results:
    r["tone"] = "light" if r["luminance"] >= median else "dark"
    r["product_clear"] = r["clarity"] >= 25 or r["filename_score"] >= 2

ordered = (
    sorted([r for r in results if r["tone"]=="light" and r["product_clear"]], key=lambda x: (-x["clarity"], -x["luminance"], x["path"]))
    + sorted([r for r in results if r["tone"]=="light" and not r["product_clear"]], key=lambda x: (-x["luminance"], x["path"]))
    + sorted([r for r in results if r["tone"]=="dark" and r["product_clear"]], key=lambda x: (-x["clarity"], x["luminance"], x["path"]))
    + sorted([r for r in results if r["tone"]=="dark" and not r["product_clear"]], key=lambda x: (x["luminance"], x["path"]))
)
print(json.dumps([r["path"] for r in ordered]))
`;

  const venvPython = '/tmp/imganalyze/bin/python3';
  const python = existsSync(venvPython) ? venvPython : 'python3';
  const result = spawnSync(python, ['-c', script], {encoding: 'utf8'});
  if (result.status !== 0) {
    throw new Error(`Image analysis failed:\n${result.stderr || result.stdout}`);
  }
  return JSON.parse(result.stdout.trim()) as string[];
}

async function adminGraphql<T>(
  shop: string,
  token: string,
  query: string,
  variables?: Record<string, unknown>,
): Promise<T> {
  const res = await fetch(`https://${shop}/admin/api/2025-01/graphql.json`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Shopify-Access-Token': token,
    },
    body: JSON.stringify({query, variables}),
  });
  const json = (await res.json()) as {data?: T; errors?: unknown};
  if (json.errors) {
    throw new Error(`GraphQL errors: ${JSON.stringify(json.errors)}`);
  }
  return json.data as T;
}

async function getProductId(shop: string, token: string): Promise<string> {
  const data = await adminGraphql<{
    productByHandle: {id: string} | null;
  }>(
    shop,
    token,
    `query($handle: String!) { productByHandle(handle: $handle) { id } }`,
    {handle: PRODUCT_HANDLE},
  );
  if (!data.productByHandle?.id) {
    throw new Error(`Product not found: ${PRODUCT_HANDLE}`);
  }
  return data.productByHandle.id;
}

async function stageAndUpload(
  shop: string,
  token: string,
  filePath: string,
): Promise<string> {
  const fileSize = statSync(filePath).size;
  const filename = basename(filePath);
  const mime = mimeType(filePath);

  const staged = await adminGraphql<{
    stagedUploadsCreate: {
      stagedTargets: Array<{
        url: string;
        resourceUrl: string;
        parameters: Array<{name: string; value: string}>;
      }>;
      userErrors: Array<{message: string}>;
    };
  }>(
    shop,
    token,
    `#graphql
    mutation($input: [StagedUploadInput!]!) {
      stagedUploadsCreate(input: $input) {
        stagedTargets { url resourceUrl parameters { name value } }
        userErrors { field message }
      }
    }`,
    {
      input: [
        {
          filename,
          mimeType: mime,
          resource: 'PRODUCT_IMAGE',
          fileSize: String(fileSize),
          httpMethod: 'POST',
        },
      ],
    },
  );

  const target = staged.stagedUploadsCreate.stagedTargets[0];
  if (!target || staged.stagedUploadsCreate.userErrors.length) {
    throw new Error(
      `stagedUploadsCreate failed for ${filename}: ${JSON.stringify(staged.stagedUploadsCreate.userErrors)}`,
    );
  }

  const form = new FormData();
  for (const param of target.parameters) {
    form.append(param.name, param.value);
  }
  form.append('file', new Blob([readFileSync(filePath)], {type: mime}), filename);

  const uploadRes = await fetch(target.url, {method: 'POST', body: form});
  if (!uploadRes.ok) {
    const body = await uploadRes.text();
    throw new Error(`Upload failed for ${filename}: ${uploadRes.status} ${body.slice(0, 200)}`);
  }

  return target.resourceUrl;
}

async function attachMedia(
  shop: string,
  token: string,
  productId: string,
  resourceUrls: string[],
  altPrefix: string,
  startIndex: number,
): Promise<string[]> {
  const media = resourceUrls.map((resourceUrl, i) => ({
    originalSource: resourceUrl,
    mediaContentType: 'IMAGE',
    alt: `${altPrefix} — image ${startIndex + i + 1}`,
  }));

  const data = await adminGraphql<{
    productCreateMedia: {
      media: Array<{id: string} | null>;
      mediaUserErrors: Array<{message: string}>;
    };
  }>(
    shop,
    token,
    `#graphql
    mutation($productId: ID!, $media: [CreateMediaInput!]!) {
      productCreateMedia(productId: $productId, media: $media) {
        media { ... on MediaImage { id } }
        mediaUserErrors { field message }
      }
    }`,
    {productId, media},
  );

  if (data.productCreateMedia.mediaUserErrors.length) {
    throw new Error(
      `productCreateMedia failed: ${JSON.stringify(data.productCreateMedia.mediaUserErrors)}`,
    );
  }

  return data.productCreateMedia.media
    .filter((m): m is {id: string} => !!m?.id)
    .map((m) => m.id);
}

async function reorderMediaByAltIndex(
  shop: string,
  token: string,
  productId: string,
  mediaItems: Array<{id: string; alt: string | null}>,
) {
  const sorted = [...mediaItems].sort((a, b) => {
    const ai = Number(a.alt?.match(/image\s+(\d+)/i)?.[1] ?? Number.MAX_SAFE_INTEGER);
    const bi = Number(b.alt?.match(/image\s+(\d+)/i)?.[1] ?? Number.MAX_SAFE_INTEGER);
    return ai - bi;
  });
  const moves = sorted.map((m, index) => ({id: m.id, newPosition: String(index)}));
  const data = await adminGraphql<{
    productReorderMedia: {userErrors: Array<{message: string}>};
  }>(
    shop,
    token,
    `#graphql
    mutation($id: ID!, $moves: [MoveInput!]!) {
      productReorderMedia(id: $id, moves: $moves) {
        userErrors { field message }
      }
    }`,
    {id: productId, moves},
  );

  if (data.productReorderMedia.userErrors.length) {
    throw new Error(
      `productReorderMedia failed: ${JSON.stringify(data.productReorderMedia.userErrors)}`,
    );
  }
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  loadEnvFile();
  const args = process.argv.slice(2).filter((a) => a !== '--dry-run');
  const dryRun = process.argv.includes('--dry-run');
  const imageDir = resolve(args[0] ?? DEFAULT_DIR);

  const shop = process.env.PUBLIC_STORE_DOMAIN ?? '';
  const token = process.env.SHOPIFY_ADMIN_ACCESS_TOKEN ?? '';

  if (!shop || !token) {
    console.error('Missing PUBLIC_STORE_DOMAIN or SHOPIFY_ADMIN_ACCESS_TOKEN');
    process.exit(1);
  }
  if (!existsSync(imageDir)) {
    console.error(`Image directory not found: ${imageDir}`);
    process.exit(1);
  }

  console.log(`Analyzing images in ${imageDir}…`);
  const orderedPaths = analyzeAndOrder(imageDir);
  console.log(`Found ${orderedPaths.length} images.`);

  console.log('\nUpload order (first 10):');
  orderedPaths.slice(0, 10).forEach((p, i) => console.log(`  ${i + 1}. ${basename(p)}`));
  console.log(`  … and ${Math.max(0, orderedPaths.length - 10)} more\n`);

  if (dryRun) {
    console.log('Dry run — no uploads performed.');
    return;
  }

  const productId = await getProductId(shop, token);
  console.log(`Product: ${PRODUCT_HANDLE} (${productId})\n`);

  const allMediaItems: Array<{id: string; alt: string | null}> = [];
  let uploaded = 0;

  for (let i = 0; i < orderedPaths.length; i += BATCH_SIZE) {
    const batch = orderedPaths.slice(i, i + BATCH_SIZE);
    const resourceUrls: string[] = [];

    for (const filePath of batch) {
      process.stdout.write(`  staging ${basename(filePath)}… `);
      const resourceUrl = await stageAndUpload(shop, token, filePath);
      resourceUrls.push(resourceUrl);
      console.log('ok');
      await sleep(300);
    }

    process.stdout.write(`  attaching batch ${Math.floor(i / BATCH_SIZE) + 1}… `);
    const mediaIds = await attachMedia(
      shop,
      token,
      productId,
      resourceUrls,
      'Cashmere Solid Pashmina',
      uploaded,
    );
    mediaIds.forEach((id, j) => {
      allMediaItems.push({
        id,
        alt: `Cashmere Solid Pashmina — image ${uploaded + j + 1}`,
      });
    });
    uploaded += mediaIds.length;
    console.log(`${mediaIds.length} attached (${uploaded}/${orderedPaths.length})`);
    await sleep(500);
  }

  console.log('\nReordering media…');
  await reorderMediaByAltIndex(shop, token, productId, allMediaItems);

  console.log(`\nDone — ${allMediaItems.length} images uploaded to ${PRODUCT_HANDLE}.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
