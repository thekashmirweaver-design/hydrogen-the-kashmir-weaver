import type { ReactNode } from "react";

export function Eyebrow({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <span className={`eyebrow ${className}`}>{children}</span>;
}

export function Hairline({ className = "" }: { className?: string }) {
  return <div className={`h-px w-full ${className}`} style={{ background: "var(--hairline)" }} />;
}
