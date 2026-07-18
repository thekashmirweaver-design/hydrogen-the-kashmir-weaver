/**
 * Shared helpers for embedding a featured/hero image into Shopify article body HTML.
 */

export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

export function escapeHtmlAttr(s: string): string {
  return escapeHtml(s).replace(/"/g, '&quot;');
}

/**
 * Insert an image after the first `</p>` (or append if none).
 * Skips when the body already contains an `<img>` so re-runs stay idempotent.
 */
export function embedImageInBodyHtml(
  bodyHtml: string,
  imageUrl: string,
  alt: string,
): string {
  const html = (bodyHtml ?? '').trim();
  const src = (imageUrl ?? '').trim();
  if (!src) return html;
  if (/<img\b/i.test(html)) return html;

  const imgBlock = `<p><img src="${escapeHtmlAttr(src)}" alt="${escapeHtmlAttr(alt.trim())}"></p>`;
  const closeP = '</p>';
  const firstClose = html.indexOf(closeP);
  if (firstClose === -1) {
    return html ? `${html}\n${imgBlock}` : imgBlock;
  }
  const insertAt = firstClose + closeP.length;
  return `${html.slice(0, insertAt)}\n${imgBlock}${html.slice(insertAt)}`;
}
