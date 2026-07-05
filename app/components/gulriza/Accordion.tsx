"use client";

import { useState, type ReactNode } from "react";
import { Plus, Minus } from "lucide-react";
import { Hairline } from "./Eyebrow";

export function Accordion({
  title,
  children,
  defaultOpen = false,
}: {
  title: string;
  children: ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div>
      <Hairline />
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex min-h-11 w-full touch-manipulation items-center justify-between py-5 text-left tracked transition hover:text-accent active:opacity-80"
      >
        <span>{title}</span>
        {open ? (
          <Minus className="h-3.5 w-3.5" strokeWidth={1} />
        ) : (
          <Plus className="h-3.5 w-3.5" strokeWidth={1} />
        )}
      </button>
      <div
        className="grid transition-all duration-500 motion-reduce:transition-none"
        style={{gridTemplateRows: open ? '1fr' : '0fr'}}
      >
        <div className="overflow-hidden">
          <div className="pb-6 text-sm leading-relaxed text-muted-foreground">{children}</div>
        </div>
      </div>
    </div>
  );
}
