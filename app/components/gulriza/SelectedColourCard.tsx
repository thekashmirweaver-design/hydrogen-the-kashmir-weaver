import type {Shade} from '~/models/types';
import {ShadeSwatch} from '~/components/gulriza/ShadeSwatch';

export function SelectedColourCard({
  shade,
  label = 'Selected colour',
  compact = false,
}: {
  shade: Shade;
  label?: string;
  compact?: boolean;
}) {
  return (
    <div
      className={`flex w-full items-center justify-between gap-3 border ${
        compact ? 'px-3 py-2' : 'px-4 py-3'
      }`}
      style={{borderColor: 'var(--border)'}}
    >
      <div className="min-w-0">
        <p className="text-[0.65rem] uppercase tracking-[0.22em] text-muted-foreground">
          {label}
        </p>
        <p className="truncate text-sm tracking-[0.04em] text-foreground">
          {shade.code} · {shade.family}
        </p>
        {!compact ? (
          <p className="text-[0.65rem] tracking-[0.16em] text-muted-foreground uppercase">
            {shade.hex}
          </p>
        ) : null}
      </div>
      <ShadeSwatch
        hex={shade.hex}
        size={compact ? 'md' : 'lg'}
        label={`${shade.code} · ${shade.family}`}
      />
    </div>
  );
}
