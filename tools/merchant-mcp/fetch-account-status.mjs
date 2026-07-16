#!/usr/bin/env node
/**
 * Deep-dive Google Merchant Center account status for The Kashmir Weaver.
 * Merchant ID: 5822844259
 */
import {google} from 'googleapis';
import {readFileSync, writeFileSync} from 'fs';
import {resolve, dirname} from 'path';
import {fileURLToPath} from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const MERCHANT_ID = '5822844259';
const KEY_PATH = resolve(
  __dirname,
  '../../secrets/google/merchant-service-account.json',
);

const key = JSON.parse(readFileSync(KEY_PATH, 'utf8'));

const auth = new google.auth.GoogleAuth({
  credentials: key,
  scopes: ['https://www.googleapis.com/auth/content'],
});

const content = google.content({version: 'v2.1', auth});

function collectIssues(node, bag = []) {
  if (!node || typeof node !== 'object') return bag;
  if (Array.isArray(node)) {
    for (const item of node) collectIssues(item, bag);
    return bag;
  }
  // AccountStatusItemLevelIssue / AccountStatusAccountIssue shapes
  if (node.code || node.servability || node.severity || node.detailedDescription) {
    if (node.code) {
      bag.push({
        code: node.code,
        severity: node.severity || null,
        servability: node.servability || null,
        resolution: node.resolution || null,
        description: node.description || node.detailedDescription || null,
        detail: node.detail || null,
        documentation: node.documentation || node.documentationUrl || null,
        destination: node.destination || null,
        country: node.country || null,
        attributeName: node.attributeName || null,
      });
    }
  }
  for (const [k, v] of Object.entries(node)) {
    if (k === 'accountLevelIssues' || k === 'itemLevelIssues' || k === 'products' || k === 'websiteClaiming') {
      collectIssues(v, bag);
    } else if (typeof v === 'object' && v !== null) {
      // Walk nested for issues arrays
      if (Array.isArray(v) && v[0] && (v[0].code || v[0].severity)) {
        collectIssues(v, bag);
      } else if (k.toLowerCase().includes('issue') || k === 'dataQualityIssues') {
        collectIssues(v, bag);
      }
    }
  }
  return bag;
}

function dedupeIssueCodes(issues) {
  const map = new Map();
  for (const iss of issues) {
    const key = iss.code;
    if (!map.has(key)) {
      map.set(key, {
        code: key,
        count: 0,
        severities: new Set(),
        destinations: new Set(),
        documentation: new Set(),
        sampleDescriptions: new Set(),
        resolutions: new Set(),
      });
    }
    const e = map.get(key);
    e.count += 1;
    if (iss.severity) e.severities.add(iss.severity);
    if (iss.destination) e.destinations.add(iss.destination);
    if (iss.documentation) e.documentation.add(iss.documentation);
    if (iss.description) e.sampleDescriptions.add(String(iss.description).slice(0, 200));
    if (iss.detail) e.sampleDescriptions.add(String(iss.detail).slice(0, 200));
    if (iss.resolution) e.resolutions.add(iss.resolution);
  }
  return [...map.values()]
    .map((e) => ({
      code: e.code,
      count: e.count,
      severities: [...e.severities],
      destinations: [...e.destinations],
      documentation: [...e.documentation],
      sampleDescriptions: [...e.sampleDescriptions].slice(0, 3),
      resolutions: [...e.resolutions],
    }))
    .sort((a, b) => b.count - a.count);
}

async function safeCall(label, fn) {
  try {
    const res = await fn();
    console.error(`OK: ${label}`);
    return {ok: true, data: res.data};
  } catch (err) {
    const msg = err?.response?.data || err?.message || String(err);
    console.error(`FAIL: ${label}:`, JSON.stringify(msg).slice(0, 500));
    return {ok: false, error: msg};
  }
}

async function main() {
  console.error('Auth client_email:', key.client_email);
  console.error('Merchant ID:', MERCHANT_ID);

  const accountStatus = await safeCall('accountstatuses.get', () =>
    content.accountstatuses.get({
      merchantId: MERCHANT_ID,
      accountId: MERCHANT_ID,
    }),
  );

  writeFileSync(
    '/tmp/merchant_account_status.json',
    JSON.stringify(accountStatus.ok ? accountStatus.data : accountStatus, null, 2),
  );
  console.error('Wrote /tmp/merchant_account_status.json');

  const account = await safeCall('accounts.get', () =>
    content.accounts.get({
      merchantId: MERCHANT_ID,
      accountId: MERCHANT_ID,
    }),
  );
  writeFileSync(
    '/tmp/merchant_account.json',
    JSON.stringify(account.ok ? account.data : account, null, 2),
  );

  // Optional program / freelistings endpoints
  const extras = {};

  extras.freelistingsprogram = await safeCall('freelistingsprogram.get', () =>
    content.freelistingsprogram.get({merchantId: MERCHANT_ID}),
  );
  extras.shoppingadsprogram = await safeCall('shoppingadsprogram.get', () =>
    content.shoppingadsprogram.get({merchantId: MERCHANT_ID}),
  );

  // accountstatuses.list as alternate
  extras.accountstatusesList = await safeCall('accountstatuses.list', () =>
    content.accountstatuses.list({merchantId: MERCHANT_ID, maxResults: 50}),
  );

  // Try CSS / account issues via accounts.claim or liase
  // Some APIs: content.liasettings, content.returnpolicyonline — skip if N/A

  writeFileSync('/tmp/merchant_extras.json', JSON.stringify(extras, null, 2));

  const issues = accountStatus.ok ? collectIssues(accountStatus.data) : [];
  // Also extract accountLevelIssues explicitly
  const raw = accountStatus.ok ? accountStatus.data : {};
  if (Array.isArray(raw.accountLevelIssues)) {
    for (const i of raw.accountLevelIssues) {
      issues.push({
        code: i.code,
        severity: i.severity,
        servability: i.servability,
        resolution: i.resolution,
        description: i.title || i.detail || i.description,
        detail: i.detail,
        documentation: i.documentation,
        destination: i.destination,
        country: i.country,
      });
    }
  }
  if (Array.isArray(raw.products)) {
    for (const p of raw.products) {
      if (Array.isArray(p.itemLevelIssues)) {
        for (const i of p.itemLevelIssues) {
          issues.push({
            code: i.code,
            severity: i.severity,
            servability: i.servability,
            resolution: i.resolution,
            description: i.description,
            detail: i.detail,
            documentation: i.documentation,
            destination: i.destination,
            country: p.country,
            attributeName: i.attributeName,
          });
        }
      }
    }
  }

  const unique = dedupeIssueCodes(issues);
  writeFileSync(
    '/tmp/merchant_issue_codes_deduped.json',
    JSON.stringify(unique, null, 2),
  );

  const summary = {
    merchantId: MERCHANT_ID,
    accountStatusOk: accountStatus.ok,
    accountOk: account.ok,
    websiteUrl: account.ok ? account.data?.websiteUrl : null,
    name: account.ok ? account.data?.name : null,
    adultContent: account.ok ? account.data?.adultContent : null,
    users: account.ok ? account.data?.users : null,
    businessInformation: account.ok ? account.data?.businessInformation : null,
    accountLevelIssues: raw.accountLevelIssues || [],
    uniqueIssueCodes: unique,
    extrasOk: Object.fromEntries(
      Object.entries(extras).map(([k, v]) => [k, v.ok]),
    ),
    freelistings: extras.freelistingsprogram?.ok
      ? extras.freelistingsprogram.data
      : extras.freelistingsprogram?.error,
    shoppingads: extras.shoppingadsprogram?.ok
      ? extras.shoppingadsprogram.data
      : extras.shoppingadsprogram?.error,
  };

  writeFileSync('/tmp/merchant_api_summary.json', JSON.stringify(summary, null, 2));
  console.error('Unique issue codes:', unique.length);
  console.error(JSON.stringify(unique.slice(0, 30), null, 2));
  console.error('DONE');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
