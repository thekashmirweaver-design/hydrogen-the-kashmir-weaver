import {extractProductColors} from '~/lib/catalog-colors';
import {toneOf, type ToneKey} from '~/lib/shade-tones';
import {SOLIDS_COLLECTION_HANDLE} from '~/lib/solid-product';
import {SHADES} from '~/models/static/shades';
import type {Product} from '~/models/types';

/** How many newest Solids to consider when picking homepage preview tiles. */
export const SOLIDS_PREVIEW_CANDIDATE_MIN = 24;
export const SOLIDS_PREVIEW_CANDIDATE_MULTIPLIER = 8;

const SHADE_BY_FAMILY = new Map<string, (typeof SHADES)[number]>();
for (const shade of SHADES) {
  const key = shade.family.toLowerCase();
  // Prefer the first palette entry per family — later duplicates can sit in a
  // neighbouring tone bucket and would skew listing diversity.
  if (!SHADE_BY_FAMILY.has(key)) SHADE_BY_FAMILY.set(key, shade);
}

/** UTC day stamp — stable SSR/hydration within a day, rotates daily. */
export function solidFamilyDaySeed(now = new Date()): number {
  return (
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()) /
    86_400_000
  );
}

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function seededShuffle<T>(items: T[], random: () => number): T[] {
  const next = items.slice();
  for (let i = next.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    const tmp = next[i]!;
    next[i] = next[j]!;
    next[j] = tmp;
  }
  return next;
}

/** Parse `{Color} Cashmere Scarf & Pashmina Shawl…` (and legacy title forms). */
export function solidColorNameFromTitle(title: string): string | undefined {
  const trimmed = title.trim();
  const modern = trimmed.match(/^(.+?)\s+Cashmere Scarf & Pashmina Shawl/i);
  if (modern?.[1]) return modern[1].trim();
  const legacy = trimmed.match(
    /^Handwoven Luxury Solid\s+(.+?)\s+Cashmere Pashmina/i,
  );
  if (legacy?.[1]) return legacy[1].trim();
  return undefined;
}

function hueTokenFromColorName(name: string): string {
  const parts = name
    .toLowerCase()
    .split(/[\s\-/]+/)
    .filter(Boolean);
  return parts[parts.length - 1] || name.toLowerCase();
}

/**
 * Family key for Solids adjacency spacing.
 *
 * Data model: each palette entry has `Shade.family`. Listing products expose a
 * Colour option (or title colour) that usually matches that family. We bucket
 * by colour **tone** (`toneOf`) so near-neighbours like Navy / Dark Navy /
 * Navy Blue do not sit side-by-side even when family strings differ.
 */
export function getSolidFamilyKey(product: Product): string {
  const colors =
    product.colors && product.colors.length > 0
      ? product.colors
      : extractProductColors(product);
  const colorName =
    colors[0]?.name?.trim() ||
    solidColorNameFromTitle(product.name) ||
    undefined;

  let hex = colors[0]?.hex;
  let familyLabel = colorName;

  if (colorName) {
    const byFamily = SHADE_BY_FAMILY.get(colorName.toLowerCase());
    if (byFamily) {
      hex = hex ?? byFamily.hex;
      familyLabel = byFamily.family;
    } else {
      // Partial match: "Dark Navy Blue" → shade family "Dark Navy" / "Navy Blue"
      const lowered = colorName.toLowerCase();
      const partial = SHADES.find(
        (shade) =>
          lowered.includes(shade.family.toLowerCase()) ||
          shade.family.toLowerCase().includes(lowered),
      );
      if (partial) {
        hex = hex ?? partial.hex;
        familyLabel = partial.family;
      }
    }
  }

  if (hex) {
    return toneOf(hex);
  }

  if (familyLabel) {
    return hueTokenFromColorName(familyLabel);
  }

  // Missing colour: unique key so empty fields do not force adjacency.
  return `id:${product.id}`;
}

export function isSolidsCollectionHandle(handle: string): boolean {
  return handle === SOLIDS_COLLECTION_HANDLE;
}

export function solidsPreviewCandidateCount(previewCount: number): number {
  const n = previewCount > 0 ? previewCount : 4;
  return Math.max(n * SOLIDS_PREVIEW_CANDIDATE_MULTIPLIER, SOLIDS_PREVIEW_CANDIDATE_MIN);
}

/**
 * Re-order so adjacent items prefer different solid families.
 * Preserves relative order within each family (keeps newest/price roughly).
 * Seeded shuffle of family pick-order adds daily variety without SSR flicker.
 */
export function orderBySolidFamilyDiversity<T>(
  items: T[],
  getFamilyKey: (item: T) => string,
  options?: {seed?: number; limit?: number},
): T[] {
  if (items.length <= 1) {
    return options?.limit != null ? items.slice(0, options.limit) : items.slice();
  }

  const seed = options?.seed ?? solidFamilyDaySeed();
  const random = mulberry32(seed * 2654435761);

  const queues = new Map<string, T[]>();
  for (const item of items) {
    const key = getFamilyKey(item);
    const list = queues.get(key);
    if (list) list.push(item);
    else queues.set(key, [item]);
  }

  const familyOrder = seededShuffle([...queues.keys()], random);
  const result: T[] = [];
  let lastFamily: string | null = null;
  const limit = options?.limit;

  while (result.length < items.length) {
    if (limit != null && result.length >= limit) break;

    let pickIndex = -1;
    let pickSize = -1;

    for (let i = 0; i < familyOrder.length; i++) {
      const family = familyOrder[i]!;
      const queue = queues.get(family);
      if (!queue?.length) continue;
      if (lastFamily != null && family === lastFamily) continue;
      if (queue.length > pickSize) {
        pickSize = queue.length;
        pickIndex = i;
      }
    }

    // One family dominates — unavoidable same-family adjacency.
    if (pickIndex < 0) {
      for (let i = 0; i < familyOrder.length; i++) {
        const family = familyOrder[i]!;
        const queue = queues.get(family);
        if (!queue?.length) continue;
        if (queue.length > pickSize) {
          pickSize = queue.length;
          pickIndex = i;
        }
      }
    }

    if (pickIndex < 0) break;

    const family = familyOrder[pickIndex]!;
    const queue = queues.get(family)!;
    result.push(queue.shift()!);
    lastFamily = family;
  }

  return result;
}

export function orderProductsBySolidFamily(
  products: Product[],
  options?: {seed?: number; limit?: number},
): Product[] {
  return orderBySolidFamilyDiversity(products, getSolidFamilyKey, options);
}

/** Type helper — tone keys are the primary family buckets when hex resolves. */
export type SolidFamilyTone = ToneKey;
