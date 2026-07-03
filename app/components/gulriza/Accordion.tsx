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
        className="flex w-full items-center justify-between py-5 text-left tracked transition hover:text-accent"
      >
        <span>{title}</span>
        {open ? (
          <Minus className="h-3.5 w-3.5" strokeWidth={1} />
        ) : (
          <Plus className="h-3.5 w-3.5" strokeWidth={1} />
        )}
      </button>
      <div
        className="overflow-hidden transition-all duration-500"
        style={{ maxHeight: open ? 600 : 0 }}
      >
        <div className="pb-6 text-sm leading-relaxed text-muted-foreground">{children}</div>
      </div>
    </div>
  );
}
