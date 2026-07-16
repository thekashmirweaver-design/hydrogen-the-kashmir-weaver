#!/usr/bin/env node
/**
 * Update Merchant Center online return policy URI.
 * Content API v2.1 patch fails validation on legacy policies; this deletes and
 * recreates via Merchant API accounts_v1 onlineReturnPolicies.create.
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
const RETURN_POLICY_URI =
  process.env.RETURN_POLICY_URI || 'https://thekashmirweaver.shop/returns';

const key = JSON.parse(readFileSync(KEY_PATH, 'utf8'));
const auth = new google.auth.GoogleAuth({
  credentials: key,
  scopes: ['https://www.googleapis.com/auth/content'],
});
const content = google.content({version: 'v2.1', auth});
const merchant = google.merchantapi({version: 'accounts_v1', auth});
const parent = `accounts/${MERCHANT_ID}`;

async function main() {
  const list = await content.returnpolicyonline.list({merchantId: MERCHANT_ID});
  const policies = list.data.returnPolicies || [];
  if (!policies.length) {
    throw new Error('No online return policies found');
  }

  const existing = policies[0];
  const policyId = existing.returnPolicyId;
  const policyName = `${parent}/onlineReturnPolicies/${policyId}`;

  if (existing.returnPolicyUri === RETURN_POLICY_URI) {
    console.log(JSON.stringify({status: 'unchanged', returnPolicyUri: RETURN_POLICY_URI}, null, 2));
    return;
  }

  await merchant.accounts.onlineReturnPolicies.delete({name: policyName});

  const created = await merchant.accounts.onlineReturnPolicies.create({
    parent,
    requestBody: {
      countries: existing.countries,
      policy: existing.policy,
      returnMethods: existing.returnMethods,
      itemConditions: existing.itemConditions,
      returnShippingFee: {type: 'CUSTOMER_PAYING_ACTUAL_FEE'},
      returnPolicyUri: RETURN_POLICY_URI,
      acceptDefectiveOnly: false,
      processRefundDays: 15,
      acceptExchange: true,
      returnLabelSource: 'CUSTOMER_RESPONSIBILITY',
    },
  });

  const verify = await content.returnpolicyonline.list({merchantId: MERCHANT_ID});
  const uri = verify.data.returnPolicies?.[0]?.returnPolicyUri;

  console.log(
    JSON.stringify(
      {
        status: uri === RETURN_POLICY_URI ? 'success' : 'verify_failed',
        deletedPolicyId: policyId,
        createdPolicyId: created.data.returnPolicyId,
        returnPolicyUri: uri,
      },
      null,
      2,
    ),
  );
}

main().catch((err) => {
  console.error(err?.response?.data || err);
  process.exit(1);
});
