import type { Money } from "./types";

/** Wraps a base-USD number as `Money`. Conversion happens only at display time. */
export const usd = (amount: number): Money => ({ amount, currencyCode: "USD" });
