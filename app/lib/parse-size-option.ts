export type ParsedSizeOption = {
  label: string;
  dimensions?: string;
};

/** Split "Stole (70 × 200 cm)" into a short label and dimensions line. */
export function parseSizeOptionValue(value: string): ParsedSizeOption {
  const match = value.match(/^(.+?)\s*\(([^)]+)\)\s*$/);
  if (!match) return {label: value.trim()};
  return {
    label: match[1].trim(),
    dimensions: match[2].trim().replace(/\s*[xX×]\s*/g, ' × '),
  };
}

export function isSizeOptionName(name: string): boolean {
  return /size/i.test(name);
}

/** Friendly label for Shopify taxonomy names like "Accessory size". */
export function optionDisplayName(name: string): string {
  if (isSizeOptionName(name)) return 'Size';
  return name;
}

/** One-line label for triggers and inline copy. */
export function formatOptionDisplay(value: string, sizeStyle = true): string {
  if (!sizeStyle) return value;
  const {label, dimensions} = parseSizeOptionValue(value);
  return dimensions ? `${label} — ${dimensions}` : label;
}
