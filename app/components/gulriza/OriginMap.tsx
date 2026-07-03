import { Reveal } from "./Reveal";

const POINTS = [
  { x: 80, y: 60, label: "Changthangi Plateau", sub: "5,000 m" },
  { x: 230, y: 130, label: "Kashmir Valley", sub: "Srinagar" },
  { x: 390, y: 200, label: "Artisan Workshop", sub: "By hand, by lamp" },
  { x: 540, y: 290, label: "Finished Pashmina", sub: "Yours, forever" },
];

export function OriginMap() {
  return (
    <div className="relative w-full">
      {/* Mobile/Tablet Vertical Timeline */}
      <div className="flex flex-col gap-8 lg:hidden">
        {POINTS.map((p, i) => (
          <div key={p.label} className="flex items-start gap-4">
            <div className="mt-1 flex flex-col items-center">
              <span
                className="flex h-4 w-4 items-center justify-center rounded-full border"
                style={{ borderColor: "var(--accent)" }}
              >
                <span
                  className="h-1.5 w-1.5 rounded-full"
                  style={{ background: "var(--accent)" }}
                />
              </span>
              {i !== POINTS.length - 1 && (
                <span
                  className="mt-2 h-12 w-px opacity-30"
                  style={{ background: "var(--accent)" }}
                />
              )}
            </div>
            <div>
              <div className="text-[0.65rem] tracking-[0.2em] text-[#F7F3EC] uppercase">
                0{i + 1} — {p.label}
              </div>
              <div className="mt-1 text-xs text-[#D6D0C6] opacity-70">{p.sub}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Desktop SVG Map */}
      <div className="hidden overflow-hidden lg:block">
        <svg viewBox="0 0 640 360" className="h-auto w-full" style={{ color: "var(--accent)" }}>
          {/* dotted route */}
          <path
            d="M 80 60 Q 150 100 230 130 T 390 200 T 540 290"
            fill="none"
            stroke="currentColor"
            strokeWidth="1"
            strokeDasharray="2 6"
            opacity="0.7"
          />
          {POINTS.map((p, i) => (
            <g key={p.label}>
              <circle
                cx={p.x}
                cy={p.y}
                r="20"
                fill="none"
                stroke="currentColor"
                strokeWidth="0.6"
                opacity="0.4"
              />
              <circle cx={p.x} cy={p.y} r="3" fill="currentColor" />
              <text
                x={p.x + 14}
                y={p.y - 6}
                fontSize="9"
                fill="#F7F3EC"
                letterSpacing="2"
                style={{
                  fontFamily: "var(--font-sans)",
                  textTransform: "uppercase",
                }}
              >
                0{i + 1} — {p.label}
              </text>
              <text
                x={p.x + 14}
                y={p.y + 8}
                fontSize="8"
                fill="#D6D0C6"
                opacity="0.7"
                style={{ fontFamily: "var(--font-sans)" }}
              >
                {p.sub}
              </text>
            </g>
          ))}
        </svg>
      </div>

      <Reveal className="mt-12 max-w-md">
        <p
          className="font-display text-xl leading-relaxed text-muted-foreground"
          style={{ fontStyle: "italic" }}
        >
          From the Changthangi goats at five thousand metres, to the hands of Kashmiri artisans,
          every thread carries a story of purity, patience and purpose.
        </p>
      </Reveal>
    </div>
  );
}
