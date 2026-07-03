/**
 * Hydrogen uses PRIVATE_STOREFRONT_API_TOKEN with Shopify-Storefront-Id headers.
 * Admin tokens (shpat_/shpss_) or other invalid values return 401 and force static catalog fallback.
 * Omit the private token so Hydrogen falls back to PUBLIC_STOREFRONT_API_TOKEN.
 */
export function resolveStorefrontEnv(env: Env): Env {
  const privateToken = env.PRIVATE_STOREFRONT_API_TOKEN?.trim();
  if (
    privateToken &&
    !privateToken.startsWith('shpat_') &&
    !privateToken.startsWith('shpss_')
  ) {
    return env;
  }
  return {...env, PRIVATE_STOREFRONT_API_TOKEN: ''};
}
