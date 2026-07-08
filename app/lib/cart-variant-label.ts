import {
  formatOptionDisplay,
  isColorOptionName,
  isSizeOptionName,
} from '~/lib/parse-size-option';

type SelectedOption = {name: string; value: string};

/** Shopify's placeholder when a product has only one variant. */
export function isDefaultVariantOption(option: SelectedOption): boolean {
  return (
    option.name === 'Title' &&
    (option.value === 'Default Title' || !option.value.trim())
  );
}

export function meaningfulSelectedOptions(
  selectedOptions: Array<SelectedOption> | null | undefined,
  options?: {omitColor?: boolean},
): SelectedOption[] {
  return (selectedOptions ?? []).filter(
    (option) =>
      option.value?.trim() &&
      !isDefaultVariantOption(option) &&
      !(options?.omitColor && isColorOptionName(option.name)),
  );
}

/** Human-readable variant label for cart line items. */
export function formatCartVariantLabel(
  productTitle: string,
  merchandise: {
    title?: string | null;
    selectedOptions?: Array<SelectedOption> | null;
  },
  options?: {omitColor?: boolean},
): string | null {
  const selectedOptions = meaningfulSelectedOptions(
    merchandise.selectedOptions,
    options,
  );

  if (selectedOptions.length === 1) {
    return selectedOptions[0].value;
  }

  if (selectedOptions.length > 1) {
    return selectedOptions
      .map((option) => `${option.name}: ${option.value}`)
      .join(' · ');
  }

  const variantTitle = merchandise.title?.trim();
  if (
    variantTitle &&
    variantTitle !== 'Default Title' &&
    variantTitle !== productTitle
  ) {
    return variantTitle;
  }

  return null;
}

/** Size label for a cart line — size option value, formatted when applicable. */
export function getCartLineSizeLabel(
  productTitle: string,
  merchandise: {
    title?: string | null;
    selectedOptions?: Array<SelectedOption> | null;
  },
): string | null {
  const sizeOption = (merchandise.selectedOptions ?? []).find(
    (option) => option.value?.trim() && isSizeOptionName(option.name),
  );
  if (sizeOption) return formatOptionDisplay(sizeOption.value, true);

  const nonColor = meaningfulSelectedOptions(merchandise.selectedOptions, {
    omitColor: true,
  });
  if (nonColor.length === 1 && !isSizeOptionName(nonColor[0].name)) {
    return nonColor[0].value;
  }

  const variantTitle = merchandise.title?.trim();
  if (
    variantTitle &&
    variantTitle !== 'Default Title' &&
    variantTitle !== productTitle &&
    nonColor.length === 0
  ) {
    return variantTitle;
  }

  return null;
}

/** Colour label from variant options when no shade attributes are on the line. */
export function getCartLineColorLabel(
  merchandise: {
    selectedOptions?: Array<SelectedOption> | null;
  },
): string | null {
  const colorOption = (merchandise.selectedOptions ?? []).find(
    (option) => option.value?.trim() && isColorOptionName(option.name),
  );
  return colorOption?.value ?? null;
}
