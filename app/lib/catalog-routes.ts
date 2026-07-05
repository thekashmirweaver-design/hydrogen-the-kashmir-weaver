/** Routes that render product grids and need the full catalog snapshot. */
export function needsFullCatalog(pathname: string): boolean {
  return (
    pathname === '/' ||
    pathname.startsWith('/collections') ||
    pathname.startsWith('/products') ||
    pathname.startsWith('/search')
  );
}
