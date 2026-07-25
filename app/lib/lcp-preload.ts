/** Build a Shopify CDN URL capped to a display width for LCP preloads. */
export function shopifyImageUrlAtWidth(src: string, width: number): string | null {
  if (!src.includes('cdn.shopify.com')) return src || null;
  try {
    const url = new URL(src);
    url.searchParams.delete('height');
    url.searchParams.delete('crop');
    url.searchParams.set('width', String(width));
    // Prefer WebP for LCP preloads (smaller than JPEG on slow mobile).
    url.searchParams.set('format', 'webp');
    return url.toString();
  } catch {
    return null;
  }
}
