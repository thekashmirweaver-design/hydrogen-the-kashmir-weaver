/**
 * Sync Google Merchant Center account shipping services to match store policy:
 * - India (IN): complimentary / free
 * - All other product destination countries: $25 flat, free over $200
 *
 * Rates match existing GMC services + storefront schema.org offers
 * (app/controllers/catalog.controller.ts). Policy text allows checkout-based
 * fees under $200; GMC requires explicit country rates.
 *
 * Usage:
 *   npx tsx scripts/sync-merchant-shipping.ts
 *   npx tsx scripts/sync-merchant-shipping.ts --dry-run
 *   npx tsx scripts/sync-merchant-shipping.ts --countries=JP,BR
 */
import {existsSync, readFileSync} from 'node:fs';
import {dirname, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {execFileSync} from 'node:child_process';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const MERCHANT = process.env.MERCHANT_ID || '5825882191';
const FREE_THRESHOLD = '200';
const INTL_RATE = '25';
const CURRENCY = 'USD';

const INTL_DELIVERY = {
  minTransitTimeInDays: 7,
  maxTransitTimeInDays: 12,
  minHandlingTimeInDays: 2,
  maxHandlingTimeInDays: 4,
};

const INDIA_DELIVERY = {
  minTransitTimeInDays: 5,
  maxTransitTimeInDays: 7,
  minHandlingTimeInDays: 2,
  maxHandlingTimeInDays: 4,
};

function loadEnv() {
  const envPath = resolve(ROOT, '.env');
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
loadEnv();

if (!process.env.GOOGLE_APPLICATION_CREDENTIALS) {
  process.env.GOOGLE_APPLICATION_CREDENTIALS = resolve(
    ROOT,
    'secrets/google/merchant-service-account.json',
  );
}

const dryRun = process.argv.includes('--dry-run');
const countriesArg = process.argv
  .find((a) => a.startsWith('--countries='))
  ?.slice('--countries='.length);

function googleToken() {
  return execFileSync(
    'gcloud',
    [
      'auth',
      'print-access-token',
      '--scopes=https://www.googleapis.com/auth/content',
    ],
    {encoding: 'utf8'},
  ).trim();
}

let cached: string | null = null;
const token = () => (cached ??= googleToken());

async function api(url: string, init?: RequestInit, attempt = 0) {
  const res = await fetch(url, {
    ...init,
    headers: {
      Authorization: `Bearer ${token()}`,
      'Content-Type': 'application/json',
      ...(init?.headers || {}),
    },
  });
  const text = await res.text();
  const data = text ? JSON.parse(text) : {};
  if ((res.status === 401 || res.status === 403) && attempt < 2) {
    cached = null;
    return api(url, init, attempt + 1);
  }
  if ((res.status === 429 || res.status >= 500) && attempt < 4) {
    await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)));
    return api(url, init, attempt + 1);
  }
  if (!res.ok) throw new Error(`${res.status} ${url}: ${text.slice(0, 1500)}`);
  return data;
}

type ShippingService = {
  name: string;
  active?: boolean;
  deliveryCountry: string;
  currency: string;
  deliveryTime: Record<string, number>;
  shipmentType?: string;
  rateGroups: unknown[];
  minimumOrderValue?: {value: string; currency: string};
};

function indiaFree(): ShippingService {
  return {
    name: 'India Standard (Free)',
    active: true,
    deliveryCountry: 'IN',
    currency: CURRENCY,
    deliveryTime: INDIA_DELIVERY,
    shipmentType: 'delivery',
    rateGroups: [
      {
        singleValue: {flatRate: {value: '0', currency: CURRENCY}},
        name: 'Complimentary India',
      },
    ],
  };
}

function intlStandard(country: string): ShippingService {
  return {
    name: `${country} Standard`,
    active: true,
    deliveryCountry: country,
    currency: CURRENCY,
    deliveryTime: INTL_DELIVERY,
    shipmentType: 'delivery',
    rateGroups: [
      {
        singleValue: {flatRate: {value: INTL_RATE, currency: CURRENCY}},
        name: 'Standard flat rate',
      },
    ],
  };
}

function intlFreeOverThreshold(country: string): ShippingService {
  return {
    name: `${country} Free over $${FREE_THRESHOLD}`,
    active: true,
    deliveryCountry: country,
    currency: CURRENCY,
    deliveryTime: INTL_DELIVERY,
    shipmentType: 'delivery',
    rateGroups: [
      {
        singleValue: {flatRate: {value: '0', currency: CURRENCY}},
        name: `Free over $${FREE_THRESHOLD}`,
      },
    ],
    minimumOrderValue: {value: FREE_THRESHOLD, currency: CURRENCY},
  };
}

function serviceKey(s: ShippingService): string {
  const mov = s.minimumOrderValue?.value ?? '';
  const rate =
    (s.rateGroups?.[0] as {singleValue?: {flatRate?: {value?: string}}})
      ?.singleValue?.flatRate?.value ?? '';
  return `${s.deliveryCountry}|mov=${mov}|rate=${rate}`;
}

async function collectDestinationCountries(): Promise<string[]> {
  const countries = new Set<string>();
  let pageToken: string | undefined;
  let pages = 0;
  while (pages < 50) {
    pages += 1;
    const q = new URLSearchParams({maxResults: '250'});
    if (pageToken) q.set('pageToken', pageToken);
    const data = await api(
      `https://shoppingcontent.googleapis.com/content/v2.1/${MERCHANT}/productstatuses?${q}`,
    );
    for (const p of data.resources || []) {
      for (const ds of p.destinationStatuses || []) {
        for (const key of [
          'approvedCountries',
          'pendingCountries',
          'disapprovedCountries',
        ] as const) {
          for (const c of ds[key] || []) countries.add(c);
        }
      }
      for (const iss of p.itemLevelIssues || []) {
        if (
          iss.code === 'missing_shipping_no_shipping_service_defined_for_country'
        ) {
          for (const c of iss.applicableCountries || []) countries.add(c);
        }
      }
    }
    pageToken = data.nextPageToken;
    if (!pageToken) break;
  }
  return [...countries].sort();
}

function ensureServices(
  existing: ShippingService[],
  countries: string[],
): {services: ShippingService[]; added: string[]; skipped: string[]} {
  const byKey = new Map(existing.map((s) => [serviceKey(s), s]));

  const added: string[] = [];
  const skipped: string[] = [];
  const services = [...existing];

  const upsert = (svc: ShippingService) => {
    const key = serviceKey(svc);
    if (byKey.has(key)) {
      skipped.push(key);
      return;
    }
    // Same country + rate + MOV already covered (possibly different name)
    const mov = svc.minimumOrderValue?.value;
    const rate = (
      svc.rateGroups?.[0] as {singleValue?: {flatRate?: {value?: string}}}
    )?.singleValue?.flatRate?.value;
    const already = services.some((s) => {
      if (s.deliveryCountry !== svc.deliveryCountry) return false;
      const sMov = s.minimumOrderValue?.value;
      const sRate = (
        s.rateGroups?.[0] as {singleValue?: {flatRate?: {value?: string}}}
      )?.singleValue?.flatRate?.value;
      return sMov === mov && sRate === rate;
    });
    if (already) {
      skipped.push(key);
      return;
    }
    services.push(svc);
    byKey.set(key, svc);
    added.push(key);
  };

  for (const country of countries) {
    if (country === 'IN') {
      upsert(indiaFree());
      continue;
    }
    upsert(intlStandard(country));
    upsert(intlFreeOverThreshold(country));
  }

  return {services, added, skipped};
}

async function main() {
  console.log('Merchant', MERCHANT, dryRun ? '(dry-run)' : '(apply)');

  const current = await api(
    `https://shoppingcontent.googleapis.com/content/v2.1/${MERCHANT}/shippingsettings/${MERCHANT}`,
  );
  const existing: ShippingService[] = current.services || [];
  const existingCountries = [
    ...new Set(existing.map((s) => s.deliveryCountry)),
  ].sort();
  console.log(
    `Existing services: ${existing.length} across ${existingCountries.length} countries`,
  );
  console.log('Existing countries:', existingCountries.join(','));

  let targetCountries: string[];
  if (countriesArg) {
    targetCountries = countriesArg
      .split(',')
      .map((c) => c.trim().toUpperCase())
      .filter(Boolean);
  } else {
    targetCountries = await collectDestinationCountries();
    console.log(
      `Product destination countries: ${targetCountries.length}`,
      targetCountries.join(','),
    );
  }

  const missing = targetCountries.filter((c) => !existingCountries.includes(c));
  console.log(
    `Countries missing any shipping service: ${missing.length}`,
    missing.join(',') || '(none)',
  );

  const {services, added, skipped} = ensureServices(existing, targetCountries);
  console.log(`Would add ${added.length} service(s); skip ${skipped.length} existing`);
  if (added.length) {
    console.log('Adding:', added.join('\n  '));
  }

  if (!added.length) {
    console.log('Nothing to update.');
    return;
  }

  if (dryRun) {
    console.log('Dry run — not writing shippingsettings.');
    return;
  }

  const body = {
    accountId: String(MERCHANT),
    services,
  };
  const updated = await api(
    `https://shoppingcontent.googleapis.com/content/v2.1/${MERCHANT}/shippingsettings/${MERCHANT}`,
    {method: 'PUT', body: JSON.stringify(body)},
  );
  const afterCountries = [
    ...new Set((updated.services || []).map((s: ShippingService) => s.deliveryCountry)),
  ].sort();
  console.log(
    `Updated. Services: ${(updated.services || []).length} across ${afterCountries.length} countries`,
  );
  console.log('Countries now:', afterCountries.join(','));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
