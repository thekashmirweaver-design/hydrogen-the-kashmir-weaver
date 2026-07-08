/**
 * Upload a single image file to the store's Shopify Files (Files API) and
 * optionally write its CDN URL into `app/lib/hero-image-urls.ts` under a
 * named key for responsive `<link rel="preload">` and `<img srcset>` use.
 *
 * Usage:
 *   tsx scripts/upload-shopify-file.ts <local-path> --alt "…" [--key NAME]
 *
 *   --key NAME   Write the resulting URL to the exported `NAME` constant in
 *                `app/lib/hero-image-urls.ts` (created if missing). Defaults
 *                to the basename without extension.
 *
 *   --replace    Overwrite an existing constant of the same name.
 *
 * Requires SHOPIFY_ADMIN_ACCESS_TOKEN with `write_files` scope in `.env`,
 * and the PUBLIC_STORE_DOMAIN. See scripts/sync-admin-token-from-cli.ts.
 */
import {existsSync, readFileSync, statSync, writeFileSync} from 'node:fs';
import {basename, extname, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

const API_VERSION = '2025-01';
const URLS_FILE = resolve(
  fileURLToPath(new URL('.', import.meta.url)),
  '..',
  'app/lib/hero-image-urls.ts',
);
const DEFAULT_PUBLIC_KEY = 'heroImage';

function loadEnvFile() {
  const root = resolve(fileURLToPath(new URL('.', import.meta.url)), '..');
  const envPath = resolve(root, '.env');
  if (!existsSync(envPath)) return;
  for (const line of readFileSync(envPath, 'utf8').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#') || !trimmed.includes('=')) continue;
    const eq = trimmed.indexOf('=');
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

function parseArgs(argv: string[]) {
  const out: {file: string; alt?: string; key: string; replace: boolean} = {
    file: '',
    key: '',
    replace: false,
  };
  const positional: string[] = [];
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--alt') {
      out.alt = argv[++i];
    } else if (a === '--key') {
      out.key = argv[++i];
    } else if (a === '--replace') {
      out.replace = true;
    } else if (!a.startsWith('--')) {
      positional.push(a);
    } else {
      throw new Error(`Unknown argument: ${a}`);
    }
  }
  if (positional.length !== 1) {
    throw new Error('Expected exactly one positional argument: <local-path>');
  }
  out.file = resolve(positional[0]);
  if (!out.key) {
    out.key = basename(positional[0], extname(positional[0]))
      .replace(/[^A-Za-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '');
    if (!out.key) out.key = DEFAULT_PUBLIC_KEY;
  }
  return out;
}

function mimeType(filePath: string): string {
  const ext = extname(filePath).toLowerCase();
  if (ext === '.png') return 'image/png';
  if (ext === '.webp') return 'image/webp';
  if (ext === '.gif') return 'image/gif';
  return 'image/jpeg';
}

type AdminResponse<T> = {data?: T; errors?: Array<{message: string}>};

async function adminGraphql<T>(
  shop: string,
  token: string,
  query: string,
  variables?: Record<string, unknown>,
): Promise<T> {
  const res = await fetch(`https://${shop}/admin/api/${API_VERSION}/graphql.json`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Shopify-Access-Token': token,
    },
    body: JSON.stringify({query, variables}),
  });
  const json = (await res.json()) as AdminResponse<T>;
  if (json.errors?.length) {
    throw new Error(`GraphQL errors: ${JSON.stringify(json.errors)}`);
  }
  if (!json.data) {
    throw new Error('GraphQL response missing data');
  }
  return json.data;
}

type StagedTarget = {
  url: string;
  resourceUrl: string;
  parameters: Array<{name: string; value: string}>;
};

async function stageUpload(
  shop: string,
  token: string,
  filePath: string,
): Promise<StagedTarget> {
  const fileSize = statSync(filePath).size;
  const filename = basename(filePath);
  const mime = mimeType(filePath);
  const data = await adminGraphql<{
    stagedUploadsCreate: {
      stagedTargets: StagedTarget[];
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
          resource: 'FILE',
          fileSize: String(fileSize),
          httpMethod: 'POST',
        },
      ],
    },
  );
  const target = data.stagedUploadsCreate.stagedTargets[0];
  if (!target || data.stagedUploadsCreate.userErrors.length) {
    throw new Error(
      `stagedUploadsCreate failed: ${JSON.stringify(data.stagedUploadsCreate.userErrors)}`,
    );
  }
  return target;
}

async function postToStaged(target: StagedTarget, filePath: string): Promise<void> {
  const mime = mimeType(filePath);
  const form = new FormData();
  for (const param of target.parameters) {
    form.append(param.name, param.value);
  }
  form.append(
    'file',
    new Blob([readFileSync(filePath)], {type: mime}),
    basename(filePath),
  );
  const res = await fetch(target.url, {method: 'POST', body: form});
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Upload failed: ${res.status} ${body.slice(0, 200)}`);
  }
}

async function createFileRecord(
  shop: string,
  token: string,
  resourceUrl: string,
  alt: string | undefined,
): Promise<{id: string; url: string}> {
  const data = await adminGraphql<{
    fileCreate: {
      files: Array<{id: string; url: string} | null>;
      userErrors: Array<{message: string}>;
    };
  }>(
    shop,
    token,
    `#graphql
    mutation($files: [FileCreateInput!]!) {
      fileCreate(files: $files) {
        files { id url }
        userErrors { field message }
      }
    }`,
    {
      files: [
        {
          originalSource: resourceUrl,
          contentType: 'IMAGE',
          ...(alt ? {alt} : {}),
        },
      ],
    },
  );
  if (data.fileCreate.userErrors.length) {
    throw new Error(
      `fileCreate failed: ${JSON.stringify(data.fileCreate.userErrors)}`,
    );
  }
  const file = data.fileCreate.files[0];
  if (!file?.url) {
    throw new Error('fileCreate returned no file');
  }
  return {id: file.id, url: file.url};
}

function updateUrlsFile(key: string, url: string, replace: boolean) {
  const exportLine = `export const ${key} = ${JSON.stringify(url)};`;
  if (!existsSync(URLS_FILE)) {
    const banner =
      '// Auto-generated by scripts/upload-shopify-file.ts.\n' +
      '// Re-run the script with --replace to update.\n\n';
    writeFileSync(URLS_FILE, `${banner}${exportLine}\n`, 'utf8');
    return;
  }
  const current = readFileSync(URLS_FILE, 'utf8');
  const pattern = new RegExp(`^export const ${key} = .*$`, 'm');
  if (pattern.test(current)) {
    if (!replace) {
      throw new Error(
        `Key "${key}" already exists in ${URLS_FILE}. Pass --replace to overwrite.`,
      );
    }
    writeFileSync(URLS_FILE, current.replace(pattern, exportLine), 'utf8');
    return;
  }
  const sep = current.endsWith('\n') ? '' : '\n';
  writeFileSync(URLS_FILE, `${current}${sep}${exportLine}\n`, 'utf8');
}

async function main() {
  loadEnvFile();
  const args = parseArgs(process.argv.slice(2));

  if (!existsSync(args.file)) {
    console.error(`File not found: ${args.file}`);
    process.exit(1);
  }

  const shop = process.env.PUBLIC_STORE_DOMAIN ?? '';
  const token = process.env.SHOPIFY_ADMIN_ACCESS_TOKEN ?? '';
  if (!shop || !token) {
    console.error(
      'Missing PUBLIC_STORE_DOMAIN or SHOPIFY_ADMIN_ACCESS_TOKEN in .env',
    );
    process.exit(1);
  }

  console.log(`Staging ${basename(args.file)} (${mimeType(args.file)})…`);
  const target = await stageUpload(shop, token, args.file);
  console.log('  staged ok');

  console.log('Uploading bytes…');
  await postToStaged(target, args.file);
  console.log('  uploaded ok');

  console.log('Creating file record…');
  const file = await createFileRecord(shop, token, target.resourceUrl, args.alt);
  console.log(`  file id: ${file.id}`);

  console.log(`\nCDN URL:\n  ${file.url}`);

  if (args.key) {
    updateUrlsFile(args.key, file.url, args.replace);
    console.log(`\nWrote ${args.key} → ${URLS_FILE}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
