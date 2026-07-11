/** Format an ISO date string as RFC 822 for RSS `pubDate` / `lastBuildDate`. */
export function toRfc822(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return new Date().toUTCString();
  }
  return date.toUTCString();
}

/** Normalize to ISO-8601 for Atom `published` / `updated`. */
export function toAtomDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return new Date().toISOString();
  }
  return date.toISOString();
}

/** Newest-first sort key from an ISO or YYYY-MM-DD date. */
export function feedDateSortKey(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return date.toISOString();
}
