import {useEffect, useRef, useState} from 'react';
import {Check, ChevronDown} from 'lucide-react';
import {
  formatOptionDisplay,
  isSizeOptionName,
  optionDisplayName,
  parseSizeOptionValue,
} from '~/lib/parse-size-option';

export function ProductOptionPicker({
  name,
  values,
  selected,
  onSelect,
}: {
  name: string;
  values: string[];
  selected: string;
  onSelect: (value: string) => void;
}) {
  if (values.length <= 1) return null;

  const displayName = optionDisplayName(name);
  const sizeStyle = isSizeOptionName(name);
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false);
        triggerRef.current?.focus();
      }
    };
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  const selectedSummary = selected
    ? formatOptionDisplay(selected, sizeStyle)
    : `Select ${displayName.toLowerCase()}`;

  return (
    <div ref={wrapRef} className="relative">
      <span className="eyebrow mb-1.5 block">{displayName}</span>
      <button
        ref={triggerRef}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={`${displayName}: ${selectedSummary}`}
        onClick={() => setOpen((o) => !o)}
        className="flex min-h-12 w-full items-center justify-between gap-4 border bg-transparent px-4 py-3 text-left transition-colors duration-300 focus:outline-none"
        style={{borderColor: open ? 'var(--accent)' : 'var(--border)'}}
      >
        <span className="min-w-0 flex-1">
          {sizeStyle && selected ? (
            <>
              <span
                className="font-display block truncate text-lg"
                style={{fontWeight: 400}}
              >
                {parseSizeOptionValue(selected).label}
              </span>
              {parseSizeOptionValue(selected).dimensions ? (
                <span className="mt-0.5 block truncate text-[0.65rem] tracking-[0.2em] text-muted-foreground uppercase">
                  {parseSizeOptionValue(selected).dimensions}
                </span>
              ) : null}
            </>
          ) : (
            <span className="block truncate text-sm tracking-[0.06em] text-foreground">
              {selectedSummary}
            </span>
          )}
        </span>
        <ChevronDown
          className="h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-300"
          strokeWidth={1}
          style={{transform: open ? 'rotate(180deg)' : undefined}}
        />
      </button>

      {open ? (
        <ul
          role="listbox"
          aria-label={displayName}
          className="absolute left-0 right-0 top-[calc(100%+0.5rem)] z-50 max-h-64 overflow-y-auto border py-1 shadow-2xl"
          style={{background: 'var(--surface)', borderColor: 'var(--border)'}}
        >
          {values.map((value) => {
            const active = selected === value;
            const {label, dimensions} = sizeStyle
              ? parseSizeOptionValue(value)
              : {label: value, dimensions: undefined};

            return (
              <li key={value} role="option" aria-selected={active}>
                <button
                  type="button"
                  onClick={() => {
                    onSelect(value);
                    setOpen(false);
                    triggerRef.current?.focus();
                  }}
                  className="flex w-full items-center justify-between gap-4 px-4 py-3.5 text-left transition-colors hover:text-accent focus:text-accent focus:outline-none"
                  style={{color: active ? 'var(--accent)' : 'var(--foreground)'}}
                >
                  <span className="min-w-0">
                    <span
                      className="block text-sm"
                      style={{fontWeight: active ? 400 : 300}}
                    >
                      {label}
                    </span>
                    {dimensions ? (
                      <span className="mt-1 block text-[0.65rem] tracking-[0.18em] text-muted-foreground uppercase">
                        {dimensions}
                      </span>
                    ) : null}
                  </span>
                  {active ? (
                    <Check className="h-3.5 w-3.5 shrink-0" strokeWidth={1.25} />
                  ) : null}
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}
