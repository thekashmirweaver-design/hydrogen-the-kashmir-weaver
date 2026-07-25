/** Routes that render product grids and need the full catalog snapshot. */
export function needsFullCatalog(pathname: string): boolean {
  // Prefer the lightweight menu snapshot for all HTML chrome. Full PDP catalogs
  // are only loaded by feeds / llms / dedicated product lookups — streaming them
  // into every shop HTML response was a ~1.5MB TTFB killer.
  // Search + collection index use menu products (≤50) which is enough for this
  // atelier; paginated shop routes fetch their own pages.
  void pathname;
  return false;
}
