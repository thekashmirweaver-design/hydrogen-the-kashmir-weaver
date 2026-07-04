import {Minus, Plus} from 'lucide-react';

export function QuantityStepper({
  quantity,
  min = 1,
  max,
  onDecrease,
  onIncrease,
  hint,
}: {
  quantity: number;
  min?: number;
  max: number;
  onDecrease: () => void;
  onIncrease: () => void;
  hint?: string;
}) {
  const atMin = quantity <= min;
  const atMax = quantity >= max;

  return (
    <div className="flex flex-col gap-2">
      <div>
        <span className="eyebrow block">Quantity</span>
        {hint ? (
          <p className="mt-2 text-[0.65rem] tracking-[0.18em] text-muted-foreground uppercase">
            {hint}
          </p>
        ) : null}
      </div>
      <div
        className="inline-flex w-fit max-w-full items-stretch border"
        style={{borderColor: 'var(--border)'}}
        role="group"
        aria-label="Quantity"
      >
        <button
          type="button"
          aria-label="Decrease quantity"
          disabled={atMin}
          onClick={onDecrease}
          className="flex min-h-11 min-w-11 flex-1 items-center justify-center text-muted-foreground transition-colors duration-300 hover:bg-[var(--surface)] hover:text-accent disabled:pointer-events-none disabled:opacity-30 sm:flex-none sm:min-w-12"
        >
          <Minus className="h-4 w-4" strokeWidth={1.25} />
        </button>
        <span
          className="flex min-h-11 min-w-[3rem] flex-1 items-center justify-center border-x px-3 text-sm tabular-nums sm:flex-none sm:min-w-[3.5rem]"
          style={{borderColor: 'var(--border)'}}
          aria-live="polite"
          aria-atomic="true"
        >
          {quantity}
        </span>
        <button
          type="button"
          aria-label="Increase quantity"
          disabled={atMax}
          onClick={onIncrease}
          className="flex min-h-11 min-w-11 flex-1 items-center justify-center text-muted-foreground transition-colors duration-300 hover:bg-[var(--surface)] hover:text-accent disabled:pointer-events-none disabled:opacity-30 sm:flex-none sm:min-w-12"
        >
          <Plus className="h-4 w-4" strokeWidth={1.25} />
        </button>
      </div>
    </div>
  );
}
