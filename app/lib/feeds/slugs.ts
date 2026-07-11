/** URL-safe slug for author/tag path segments. */
export function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function slugEquals(a: string, b: string): boolean {
  return slugify(a) === slugify(b);
}
