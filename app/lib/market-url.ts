/** Append or replace `country` on an internal path + search string. */
export function marketHref(
  pathname: string,
  search: string,
  countryCode: string | undefined,
): string {
  if (!countryCode?.trim()) {
    return search ? `${pathname}?${search}` : pathname;
  }

  const params = new URLSearchParams(search);
  params.set('country', countryCode.toUpperCase());
  const query = params.toString();
  return query ? `${pathname}?${query}` : pathname;
}
