const DEFAULT_MESSAGES = [
  "Authentic Kashmiri Pashmina",
  "Handcrafted by Artisans",
  "Free Worldwide Shipping Over $200",
  "Certificate of Authenticity Included",
];

export function Marquee({ messages = DEFAULT_MESSAGES }: { messages?: string[] }) {
  // We render 4 identical groups. The CSS keyframe will translate exactly -50% (2 groups) or -25% (1 group)
  // to create a seamless infinite scroll.
  return (
    <div
      className="relative flex overflow-hidden border-b"
      style={{
        borderColor: "var(--border)",
        background: "var(--surface)",
        height: "var(--marquee-h, 36px)",
      }}
      role="region"
      aria-label="Announcements"
    >
      <div className="marquee-track flex h-full w-max items-center will-change-transform">
        {[...Array(4)].map((_, groupIndex) => (
          <div key={groupIndex} className="flex shrink-0 items-center">
            {messages.map((m, i) => (
              <span
                key={i}
                className="flex items-center text-[0.75rem] font-medium uppercase tracking-[0.15em] text-foreground/90"
              >
                <span className="px-8">{m}</span>
                <span aria-hidden style={{ color: "var(--accent)" }}>
                  •
                </span>
              </span>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
