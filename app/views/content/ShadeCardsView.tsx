import {useState, useMemo} from 'react';
import {ExternalLink} from 'lucide-react';
import {SHADES} from '~/models/static/shades';

/** Official printable shade card (Google Drive). */
export const SHADE_CARD_PDF_URL =
  'https://drive.google.com/file/d/1uBrCxSpr0LCpOW9MMhCPXj-VcVgHR4SE/view';

function extractPrimaryFamily(family: string) {
  return family.split(' / ')[0];
}

const TONES = [
  'Cream', 'Yellow', 'Orange', 'Gold', 'Peach', 'Brown', 'Tan',
  'Green', 'Teal', 'Blue', 'Navy',
  'Purple', 'Lavender', 'Mauve', 'Lilac',
  'Pink', 'Rose', 'Magenta', 'Red', 'Maroon',
  'Grey', 'Charcoal', 'White', 'Khaki', 'Taupe', 'Olive', 'Sage', 'Mint',
] as const;

export function ShadeCardsView() {
  const [activeTone, setActiveTone] = useState<string | null>(null);

  const groups = useMemo(() => {
    const map: Record<string, typeof SHADES> = {};
    for (const shade of SHADES) {
      const key = extractPrimaryFamily(shade.family);
      if (!map[key]) map[key] = [];
      map[key].push(shade);
    }
    return map;
  }, []);

  const visibleKeys = useMemo(() => {
    if (!activeTone) return Object.keys(groups).sort();
    return Object.keys(groups)
      .filter((k) => k === activeTone)
      .sort();
  }, [activeTone, groups]);

  const handleCopy = (hex: string) => {
    navigator.clipboard.writeText(hex);
  };

  return (
    <div className="pt-32 pb-48">
      <div className="mx-auto max-w-[1600px] px-6 md:px-10">
        <div className="mb-12 text-center">
          <p className="eyebrow">The Kashmir Weaver</p>
          <h1
            className="font-display mt-4 text-4xl leading-[1.1] md:text-6xl"
            style={{fontWeight: 300}}
          >
            Shade Cards
          </h1>
          <p className="mx-auto mt-4 max-w-lg text-muted-foreground">
            {SHADES.length} colours organised by family. Click any card to copy its hex value,
            or open the official shade card PDF.
          </p>
          <a
            href={SHADE_CARD_PDF_URL}
            target="_blank"
            rel="noreferrer"
            className="tracked mt-8 inline-flex items-center gap-3 border px-8 py-4 text-sm transition hover:border-accent hover:text-accent"
            style={{borderColor: 'var(--border)'}}
          >
            View official shade card (PDF)
            <ExternalLink className="h-4 w-4" strokeWidth={1.25} aria-hidden />
          </a>
        </div>

        <div className="mb-12 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => setActiveTone(null)}
            className={`tracked px-4 py-2 text-xs transition ${
              activeTone === null
                ? 'bg-accent text-background'
                : 'border border-border text-muted-foreground hover:text-foreground'
            }`}
          >
            All
          </button>
          {TONES.filter((t) => groups[t]).map((tone) => (
            <button
              key={tone}
              onClick={() => setActiveTone(tone)}
              className={`tracked px-4 py-2 text-xs transition ${
                activeTone === tone
                  ? 'bg-accent text-background'
                  : 'border border-border text-muted-foreground hover:text-foreground'
              }`}
            >
              {tone} ({groups[tone].length})
            </button>
          ))}
        </div>

        <div className="space-y-20">
          {visibleKeys.map((key) => (
            <section key={key}>
              <div className="mb-6 flex items-baseline gap-4">
                <h2
                  className="font-display text-2xl md:text-3xl"
                  style={{fontWeight: 400}}
                >
                  {key}
                </h2>
                <span className="text-sm text-muted-foreground">
                  {groups[key].length} shades
                </span>
              </div>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
                {groups[key].map((shade) => (
                  <button
                    key={shade.code}
                    onClick={() => handleCopy(shade.hex)}
                    className="group relative overflow-hidden border border-border/50 transition hover:border-accent/40 hover:shadow-lg hover:shadow-accent/5"
                    style={{background: 'var(--surface)'}}
                  >
                    <div
                      className="h-28 w-full sm:h-32"
                      style={{background: shade.hex}}
                    />
                    <div className="p-3 text-left">
                      <div className="font-mono text-xs font-medium text-foreground/90">
                        {shade.code}
                      </div>
                      <div className="mt-0.5 font-mono text-[11px] text-muted-foreground">
                        {shade.hex}
                      </div>
                      <div className="mt-1 truncate text-[11px] text-muted-foreground/70">
                        {shade.family}
                      </div>
                    </div>
                    <div className="absolute top-2 right-2 rounded bg-background/70 px-1.5 py-0.5 text-[10px] text-muted-foreground opacity-0 backdrop-blur transition group-hover:opacity-100">
                      copy
                    </div>
                  </button>
                ))}
              </div>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}
