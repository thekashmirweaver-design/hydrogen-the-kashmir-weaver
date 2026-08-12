/**
 * Internal href for navigation. Market/currency is session-backed —
 * never append `?country=`. Other query params are preserved; `country` is stripped.
 */
export function marketHref(pathname: string, search = ''): string {
  const raw = search.startsWith('?') ? search.slice(1) : search;
  if (!raw) return pathname;

  const params = new URLSearchParams(raw);
  params.delete('country');
  const query = params.toString();
  return query ? `${pathname}?${query}` : pathname;
}

/** True when the location search still carries a market `country` param. */
export function hasCountryParam(search: string): boolean {
  const raw = search.startsWith('?') ? search.slice(1) : search;
  if (!raw) return false;
  return new URLSearchParams(raw).has('country');
}
