'use client';

import {useLayoutEffect, useRef, useState} from 'react';
import {ChevronDown} from 'lucide-react';

const TRUNCATE_AT = 140;
/** ~3 lines at text-base + leading-relaxed */
const COLLAPSED_MAX_HEIGHT = '4.875rem';

export function CollectionStoryMobile({text}: {text: string}) {
  const [expanded, setExpanded] = useState(false);
  const contentRef = useRef<HTMLParagraphElement>(null);
  const [fullHeight, setFullHeight] = useState<number | null>(null);
  const truncatable = text.length > TRUNCATE_AT;

  useLayoutEffect(() => {
    const el = contentRef.current;
    if (!el) return;
    setFullHeight(el.scrollHeight);
  }, [text]);

  return (
    <div>
      <div
        className="overflow-hidden transition-[max-height] duration-500 ease-in-out motion-reduce:transition-none"
        style={{
          maxHeight: !truncatable
            ? undefined
            : expanded
              ? fullHeight != null
                ? `${fullHeight}px`
                : '32rem'
              : COLLAPSED_MAX_HEIGHT,
        }}
      >
        <p
          ref={contentRef}
          className="max-w-xl text-base leading-relaxed text-muted-foreground"
        >
          {text}
        </p>
      </div>
      {truncatable && (
        <button
          type="button"
          onClick={() => setExpanded((open) => !open)}
          className="tracked mt-4 inline-flex items-center gap-2 text-accent transition hover:opacity-80"
          aria-expanded={expanded}
        >
          {expanded ? 'Read less' : 'Read more'}
          <ChevronDown
            className="h-3.5 w-3.5 transition-transform duration-500 ease-in-out motion-reduce:transition-none"
            strokeWidth={1.5}
            style={{transform: expanded ? 'rotate(180deg)' : undefined}}
          />
        </button>
      )}
    </div>
  );
}
