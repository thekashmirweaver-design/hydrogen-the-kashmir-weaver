#!/usr/bin/env node
/**
 * One-off: update Merchant Center business address + return policy URI.
 * Run from repo root with GOOGLE_APPLICATION_CREDENTIALS set.
 */
import {google} from 'googleapis';
import {readFileSync} from 'fs';
import {resolve, dirname} from 'path';
import {fileURLToPath} from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const MERCHANT_ID = process.env.MERCHANT_ID || '5822844259';
const KEY_PATH =
  process.env.GOOGLE_APPLICATION_CREDENTIALS ||
  resolve(__dirname, '../../secrets/google/merchant-service-account.json');

const key = JSON.parse(readFileSync(KEY_PATH, 'utf8'));
const auth = new google.auth.GoogleAuth({
  credentials: key,
  scopes: ['https://www.googleapis.com/auth/content'],
});
const content = google.content({version: 'v2.1', auth});

const BUSINESS_ADDRESS = {
  streetAddress: 'H 10-A, Firdousa Abad, Batamaloo',
  locality: 'Srinagar',
  region: 'Jammu and Kashmir',
  postalCode: '190009',
  country: 'IN',
};

const RETURN_POLICY_URI = 'https://thekashmirweaver.shop/returns';

async function safeCall(label, fn) {
  try {
    const res = await fn();
    console.log(`OK: ${label}`);
    return {ok: true, data: res.data};
  } catch (err) {
    const msg = err?.response?.data || err?.message || String(err);
    console.log(`FAIL: ${label}:`, JSON.stringify(msg, null, 2));
    return {ok: false, error: msg};
  }
}

async function main() {
  const before = await safeCall('accounts.get (before)', () =>
    content.accounts.get({merchantId: MERCHANT_ID, accountId: MERCHANT_ID}),
  );

  const addressUpdate = before.ok
    ? await safeCall('accounts.update (business address)', () =>
        content.accounts.update({
          merchantId: MERCHANT_ID,
          accountId: MERCHANT_ID,
          requestBody: {
            ...before.data,
            id: MERCHANT_ID,
            businessInformation: {
              ...before.data.businessInformation,
              address: BUSINESS_ADDRESS,
            },
          },
        }),
      )
    : {ok: false, error: 'Skipped — could not load account before update'};

  const returnPolicyList = await safeCall('returnpolicyonline.list', () =>
    content.returnpolicyonline.list({merchantId: MERCHANT_ID}),
  );

  const returnPolicyId =
    returnPolicyList.ok &&
    (returnPolicyList.data?.returnPolicies?.[0]?.returnPolicyId ||
      returnPolicyList.data?.resources?.[0]?.returnPolicyId)
      ? returnPolicyList.data.returnPolicies?.[0]?.returnPolicyId ||
        returnPolicyList.data.resources?.[0]?.returnPolicyId
      : null;

  const returnPolicyGet = returnPolicyId
    ? await safeCall('returnpolicyonline.get', () =>
        content.returnpolicyonline.get({
          merchantId: MERCHANT_ID,
          returnPolicyId,
        }),
      )
    : {ok: false, error: 'No returnPolicyId found via returnpolicyonline.list'};

  const returnPolicyPatch =
    returnPolicyGet.ok && returnPolicyId
      ? await safeCall('returnpolicyonline.patch (return policy URI)', () =>
          content.returnpolicyonline.patch({
            merchantId: MERCHANT_ID,
            returnPolicyId,
            requestBody: {
              ...returnPolicyGet.data,
              returnPolicyId,
              name: `accounts/${MERCHANT_ID}/onlineReturnPolicies/${returnPolicyId}`,
              returnPolicyUri: RETURN_POLICY_URI,
            },
          }),
        )
      : {ok: false, error: 'Skipped — no return policy payload'};

  const after = await safeCall('accounts.get (after)', () =>
    content.accounts.get({merchantId: MERCHANT_ID, accountId: MERCHANT_ID}),
  );

  console.log(
    JSON.stringify(
      {
        merchantId: MERCHANT_ID,
        beforeBusinessAddress: before.ok
          ? before.data?.businessInformation?.address
          : null,
        addressUpdate,
        returnPolicyList: returnPolicyList.ok ? returnPolicyList.data : returnPolicyList.error,
        returnPolicyGet: returnPolicyGet.ok ? returnPolicyGet.data : returnPolicyGet.error,
        returnPolicyPatch,
        afterBusinessAddress: after.ok
          ? after.data?.businessInformation?.address
          : null,
      },
      null,
      2,
    ),
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
