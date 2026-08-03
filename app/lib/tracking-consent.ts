type ConsentCategory = 'analytics' | 'marketing';

type CustomerPrivacyApi = {
  canTrack?: () => boolean | Promise<boolean>;
  analyticsProcessingAllowed?: () => boolean;
  marketingAllowed?: () => boolean;
  marketingProcessingAllowed?: () => boolean;
};

function readWindowCustomerPrivacy(): CustomerPrivacyApi | null {
  if (typeof window === 'undefined') return null;
  const shopify = (window as Window & {Shopify?: {customerPrivacy?: CustomerPrivacyApi}})
    .Shopify;
  return shopify?.customerPrivacy ?? null;
}

function callBooleanGetter(getter?: () => boolean): boolean | null {
  if (typeof getter !== 'function') return null;
  return getter();
}

async function callCanTrack(getter?: () => boolean | Promise<boolean>): Promise<boolean | null> {
  if (typeof getter !== 'function') return null;
  const value = getter();
  if (typeof value === 'boolean') return value;
  const awaited = await value;
  return typeof awaited === 'boolean' ? awaited : null;
}

/**
 * Respect Shopify Customer Privacy when available.
 * If no Customer Privacy API is present on the window, keep tracking enabled.
 */
export async function canTrackForCategory(
  category: ConsentCategory,
): Promise<boolean> {
  const customerPrivacy = readWindowCustomerPrivacy();
  if (!customerPrivacy) return true;

  if (category === 'analytics') {
    const analytics = callBooleanGetter(customerPrivacy.analyticsProcessingAllowed);
    if (analytics != null) return analytics;
  } else {
    const marketing =
      callBooleanGetter(customerPrivacy.marketingProcessingAllowed) ??
      callBooleanGetter(customerPrivacy.marketingAllowed);
    if (marketing != null) return marketing;
  }

  const fallback = await callCanTrack(customerPrivacy.canTrack);
  return fallback ?? false;
}
