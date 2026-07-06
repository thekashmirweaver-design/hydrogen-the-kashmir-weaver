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
): SelectedOption[] {
  return (selectedOptions ?? []).filter(
    (option) => option.value?.trim() && !isDefaultVariantOption(option),
  );
}

/** Human-readable variant label for cart line items. */
export function formatCartVariantLabel(
  productTitle: string,
  merchandise: {
    title?: string | null;
    selectedOptions?: Array<SelectedOption> | null;
  },
): string | null {
  const options = meaningfulSelectedOptions(merchandise.selectedOptions);

  if (options.length === 1) {
    return options[0].value;
  }

  if (options.length > 1) {
    return options.map((option) => `${option.name}: ${option.value}`).join(' · ');
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
