export const META_DESCRIPTION_MAX = 160;

/** Truncate long copy for meta description and OG tags. */
export function truncateMetaDescription(
  text: string,
  max = META_DESCRIPTION_MAX,
): string {
  const trimmed = text.trim();
  if (!trimmed) return '';
  if (trimmed.length <= max) return trimmed;
  return `${trimmed.slice(0, max - 1).trimEnd()}…`;
}
