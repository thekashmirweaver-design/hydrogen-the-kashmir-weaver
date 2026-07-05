/** Reorder product media using alt text index from upload (image 1, image 2, …). */
import {readFileSync, existsSync} from 'node:fs';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

const PRODUCT_ID = 'gid://shopify/Product/9319559889111';

function loadEnvFile() {
  const root = resolve(fileURLToPath(new URL('.', import.meta.url)), '..');
  for (const line of readFileSync(resolve(root, '.env'), 'utf8').split('\n')) {
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

async function gql(query: string, variables?: Record<string, unknown>) {
  const shop = process.env.PUBLIC_STORE_DOMAIN!;
  const token = process.env.SHOPIFY_ADMIN_ACCESS_TOKEN!;
  const res = await fetch(`https://${shop}/admin/api/2025-01/graphql.json`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Shopify-Access-Token': token,
    },
    body: JSON.stringify({query, variables}),
  });
  const json = (await res.json()) as {data?: unknown; errors?: unknown};
  if (json.errors) throw new Error(JSON.stringify(json.errors));
  return json.data as Record<string, unknown>;
}

function parseAltIndex(alt: string | null): number {
  const match = alt?.match(/image\s+(\d+)/i);
  return match ? Number(match[1]) : Number.MAX_SAFE_INTEGER;
}

async function main() {
  loadEnvFile();

  const data = (await gql(
    `query($id: ID!) {
      product(id: $id) {
        media(first: 100) {
          nodes { ... on MediaImage { id alt image { url } } }
        }
      }
    }`,
    {id: PRODUCT_ID},
  )) as {product: {media: {nodes: Array<{id: string; alt: string | null; image: {url: string}}>}}};

  const media = data.product.media.nodes;
  const sorted = [...media].sort((a, b) => parseAltIndex(a.alt) - parseAltIndex(b.alt));
  const orderedIds = sorted.map((m) => m.id);

  console.log(`Reordering ${orderedIds.length} media items by alt index…`);
  const moves = orderedIds.map((id, index) => ({id, newPosition: String(index)}));
  const result = (await gql(
    `mutation($id: ID!, $moves: [MoveInput!]!) {
      productReorderMedia(id: $id, moves: $moves) {
        userErrors { message }
      }
    }`,
    {id: PRODUCT_ID, moves},
  )) as {productReorderMedia: {userErrors: Array<{message: string}>}};

  if (result.productReorderMedia.userErrors.length) {
    throw new Error(JSON.stringify(result.productReorderMedia.userErrors));
  }

  await new Promise((r) => setTimeout(r, 2000));

  const verify = (await gql(
    `query($id: ID!) {
      product(id: $id) {
        media(first: 8, sortKey: POSITION) {
          nodes { ... on MediaImage { alt image { url } } }
        }
      }
    }`,
    {id: PRODUCT_ID},
  )) as {product: {media: {nodes: Array<{alt: string | null; image: {url: string}}>}}};

  console.log('\nFirst 8 images after reorder:');
  verify.product.media.nodes.forEach((n, i) => {
    const name = decodeURIComponent(n.image.url.split('/').pop()!.split('?')[0]);
    console.log(`  ${i + 1}. [${n.alt}] ${name.slice(0, 55)}`);
  });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
