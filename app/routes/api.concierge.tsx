import {data} from 'react-router';
import {sendConciergeInquiryEmail} from '~/lib/concierge-email';
import {loadShopSettings} from '~/lib/shop-settings';
import type {Route} from './+types/api.concierge';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function action({request, context}: Route.ActionArgs) {
  if (request.method !== 'POST') {
    return data({error: 'Method not allowed'}, {status: 405});
  }

  const form = await request.formData();
  const inquiryType = String(form.get('inquiryType') ?? '').trim();
  const name = String(form.get('name') ?? '').trim();
  const email = String(form.get('email') ?? '').trim();
  const location = String(form.get('location') ?? '').trim();
  const phone = String(form.get('phone') ?? '').trim();
  const message = String(form.get('message') ?? '').trim();

  const errors: Record<string, string> = {};
  if (!inquiryType) errors.inquiryType = 'Please select an inquiry type.';
  if (!name) errors.name = 'Please enter your name.';
  if (!email) errors.email = 'Please enter your email.';
  else if (!EMAIL_RE.test(email)) errors.email = 'Please enter a valid email.';
  if (!location) errors.location = 'Please enter your country or city.';
  if (!message) errors.message = 'Please tell us how we may assist you.';

  if (Object.keys(errors).length > 0) {
    return data({success: false, errors}, {status: 400});
  }

  const payload = {
    inquiryType,
    name,
    email,
    location,
    phone: phone || null,
    message,
    submittedAt: new Date().toISOString(),
  };

  const shopSettings = await loadShopSettings(context.storefront, {
    publicStoreDomain: context.env.PUBLIC_STORE_DOMAIN,
    canonicalStoreUrl: context.env.PUBLIC_STORE_URL,
  });

  const emailResult = await sendConciergeInquiryEmail(payload, context.env, {
    shopContactEmail: shopSettings.contact.email,
  });
  if (!emailResult.ok) {
    return data(
      {success: false, errors: {form: emailResult.error}},
      {status: 503},
    );
  }

  return data({success: true});
}
