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

export function isColorOptionName(name: string): boolean {
  return /colou?r/i.test(name);
}

type SelectedOption = {name: string; value: string};

/** Colour from the selected variant, or the product's sole Color option value. */
export function getProductColor(
  options: Array<{name: string; values: string[]}> | undefined,
  selectedOptions?: SelectedOption[],
): string | undefined {
  const fromVariant = selectedOptions?.find((o) =>
    isColorOptionName(o.name),
  )?.value;
  if (fromVariant) return fromVariant;

  const colorOption = options?.find(
    (option) => isColorOptionName(option.name) && option.values.length > 0,
  );
  return colorOption?.values[0];
}

/** Friendly label for Shopify taxonomy names like "Accessory size". */
export function optionDisplayName(name: string): string {
  if (isSizeOptionName(name)) return 'Size';
  if (isColorOptionName(name)) return 'Colour';
  return name;
}

/** One-line label for triggers and inline copy. */
export function formatOptionDisplay(value: string, sizeStyle = true): string {
  if (!sizeStyle) return value;
  const {label, dimensions} = parseSizeOptionValue(value);
  return dimensions ? `${label} — ${dimensions}` : label;
}
