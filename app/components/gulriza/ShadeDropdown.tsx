import {useEffect, useMemo, useRef, useState} from 'react';
import {Check, ChevronDown} from 'lucide-react';
import type {Shade} from '~/models/types';
import {findShadeByCode} from '~/lib/solid-product';

function ShadeDot({hex, className = 'h-4 w-4'}: {hex: string; className?: string}) {
  return (
    <span
      aria-hidden
      className={`shrink-0 rounded-full border border-white shadow-[0_0_0_1px_var(--border)] ${className}`}
      style={{backgroundColor: hex}}
    />
  );
}

function shadeLabel(shade: Shade): string {
  return `${shade.code} · ${shade.family}`;
}

export function ShadeDropdown({
  shades,
  selectedCode,
  onSelect,
  label = 'Colour',
  showLabel = true,
}: {
  shades: Shade[];
  selectedCode: string;
  onSelect: (code: string) => void;
  label?: string;
  showLabel?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const selectedShade = useMemo(
    () => findShadeByCode(shades, selectedCode) ?? shades[0] ?? null,
    [selectedCode, shades],
  );

  const selectedSummary = selectedShade ? shadeLabel(selectedShade) : label;

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

  useEffect(() => {
    if (!open || !listRef.current) return;
    requestAnimationFrame(() => {
      const active = listRef.current?.querySelector('[aria-selected="true"]');
      active?.scrollIntoView({block: 'center'});
    });
  }, [open, selectedCode]);

  if (!shades.length || !selectedShade) return null;

  return (
    <div ref={wrapRef} className="relative">
      {showLabel ? <span className="eyebrow mb-1.5 block">{label}</span> : null}
      <button
        ref={triggerRef}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={`${label}: ${selectedSummary}`}
        onClick={() => setOpen((o) => !o)}
        className="flex min-h-12 w-full items-center justify-between gap-4 border bg-transparent px-4 py-3 text-left transition-colors duration-300 focus:outline-none"
        style={{borderColor: open ? 'var(--accent)' : 'var(--border)'}}
      >
        <span className="flex min-w-0 flex-1 items-center gap-3">
          <ShadeDot hex={selectedShade.hex} />
          <span className="min-w-0">
            <span className="block truncate text-sm tracking-[0.06em] text-foreground">
              {selectedSummary}
            </span>
            <span className="mt-0.5 block truncate text-[0.65rem] tracking-[0.18em] text-muted-foreground uppercase">
              {selectedShade.hex}
            </span>
          </span>
        </span>
        <ChevronDown
          className="h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-300"
          strokeWidth={1}
          style={{transform: open ? 'rotate(180deg)' : undefined}}
        />
      </button>

      {open ? (
        <ul
          ref={listRef}
          role="listbox"
          aria-label={label}
          className="absolute left-0 right-0 top-[calc(100%+0.5rem)] z-50 max-h-64 overflow-y-auto border py-1 shadow-2xl"
          style={{background: 'var(--surface)', borderColor: 'var(--border)'}}
        >
          {shades.map((shade) => {
            const active = selectedCode === shade.code;
            return (
              <li key={shade.code} role="option" aria-selected={active}>
                <button
                  type="button"
                  onClick={() => {
                    onSelect(shade.code);
                    setOpen(false);
                    triggerRef.current?.focus();
                  }}
                  className="flex w-full items-center justify-between gap-4 px-4 py-3.5 text-left transition-colors hover:text-accent focus:text-accent focus:outline-none"
                  style={{color: active ? 'var(--accent)' : 'var(--foreground)'}}
                >
                  <span className="flex min-w-0 items-center gap-3">
                    <ShadeDot hex={shade.hex} />
                    <span className="min-w-0">
                      <span
                        className="block truncate text-sm"
                        style={{fontWeight: active ? 400 : 300}}
                      >
                        {shadeLabel(shade)}
                      </span>
                      <span className="mt-1 block truncate text-[0.65rem] tracking-[0.18em] text-muted-foreground uppercase">
                        {shade.hex}
                      </span>
                    </span>
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
