'use client';

import {useEffect, useState} from 'react';

const WORDS = ['Scarves', 'Stoles', 'Shawls', '& More'] as const;
const LONGEST_WORD = 'Scarves';
const CYCLE_MS = 2800;

export function HeroDeliveryLine({className = ''}: {className?: string}) {
  const [index, setIndex] = useState(0);
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const syncMotion = () => setReduceMotion(media.matches);
    syncMotion();
    media.addEventListener('change', syncMotion);

    if (media.matches) {
      return () => media.removeEventListener('change', syncMotion);
    }

    const id = window.setInterval(() => {
      setIndex((current) => (current + 1) % WORDS.length);
    }, CYCLE_MS);

    return () => {
      window.clearInterval(id);
      media.removeEventListener('change', syncMotion);
    };
  }, []);

  const activeWord = WORDS[reduceMotion ? 0 : index];

  return (
    <p
  className={`mt-6 flex flex-wrap items-baseline gap-x-2 text-pretty font-display text-[1.0625rem] leading-relaxed text-muted-foreground md:mt-8 md:text-xl ${className}`}
  style={{ fontWeight: 300 }}
>
  <span>Delivering Pashmina</span>

  <span className="hero-rotating-slot inline-flex items-baseline">
    <span className="hero-rotating-slot__sizer" aria-hidden>
      {LONGEST_WORD}
    </span>

    <span
      key={reduceMotion ? "static" : `${index}-${activeWord}`}
      className="hero-rotating-slot__word"
      aria-hidden
    >
      {activeWord}
    </span>
  </span>

  <span className="text-foreground/85">Worldwide</span>

  <span className="sr-only">
    Delivering Pashmina {WORDS.join(", ")} Worldwide
  </span>
</p>
  );
}
