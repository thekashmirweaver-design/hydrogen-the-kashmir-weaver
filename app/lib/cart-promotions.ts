import type {CartApiQueryFragment} from 'storefrontapi.generated';

type MoneyLike = {amount: string; currencyCode: string};

export type CartPromotionSummary = {
  subtotal: MoneyLike | null;
  total: MoneyLike | null;
  discountTotal: number;
  giftCardTotal: number;
  appliedDiscountCodes: string[];
  rejectedDiscountCodes: string[];
  appliedGiftCards: Array<{id: string; lastCharacters: string; amountUsed: MoneyLike}>;
  hasAdjustments: boolean;
};

function sumMoneyAmount(items: Array<MoneyLike | null | undefined>): number {
  return items.reduce((sum, item) => sum + (item ? Number(item.amount) : 0), 0);
}

export function getCartPromotionSummary(
  cart: CartApiQueryFragment | null | undefined,
): CartPromotionSummary {
  const subtotal = cart?.cost?.subtotalAmount ?? null;
  const total = cart?.cost?.totalAmount ?? null;
  const discountTotal = sumMoneyAmount(
    cart?.discountAllocations?.map((a) => a.discountedAmount) ?? [],
  );
  const giftCardTotal = sumMoneyAmount(
    cart?.appliedGiftCards?.map((g) => g.amountUsed) ?? [],
  );
  const appliedDiscountCodes =
    cart?.discountCodes?.filter((c) => c.applicable).map((c) => c.code) ?? [];
  const rejectedDiscountCodes =
    cart?.discountCodes?.filter((c) => !c.applicable).map((c) => c.code) ?? [];
  const appliedGiftCards =
    cart?.appliedGiftCards?.map((g) => ({
      id: g.id,
      lastCharacters: g.lastCharacters,
      amountUsed: g.amountUsed,
    })) ?? [];

  return {
    subtotal,
    total,
    discountTotal,
    giftCardTotal,
    appliedDiscountCodes,
    rejectedDiscountCodes,
    appliedGiftCards,
    hasAdjustments: discountTotal > 0 || giftCardTotal > 0,
  };
}

export function cartActionErrorMessage(
  errors: Array<{message?: string | null}> | null | undefined,
): string | null {
  if (!errors?.length) return null;
  const messages = errors
    .map((e) => e.message?.trim())
    .filter((m): m is string => Boolean(m));
  return messages.length ? messages.join(' ') : null;
}
