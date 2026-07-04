const WEIGHT_UNIT_LABELS: Record<string, string> = {
  GRAMS: 'g',
  KILOGRAMS: 'kg',
  OUNCES: 'oz',
  POUNDS: 'lb',
};

/** Formats Storefront variant weight + unit for PDP display. */
export function formatVariantWeight(
  weight?: number | null,
  weightUnit?: string | null,
): string | undefined {
  if (weight == null || !Number.isFinite(weight) || weight <= 0) return undefined;
  const unit = weightUnit?.toUpperCase() ?? 'GRAMS';
  const suffix = WEIGHT_UNIT_LABELS[unit] ?? unit.toLowerCase();
  const value = Number.isInteger(weight) ? String(weight) : String(weight);
  return `${value} ${suffix}`;
}
