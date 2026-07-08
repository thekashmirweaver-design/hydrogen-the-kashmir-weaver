'use client';

import {useEffect, useState} from 'react';

const WORDS = ['Shawls', 'Stoles', 'Scarves', 'Wraps'] as const;
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
      className={`mt-6 flex flex-nowrap items-baseline gap-x-2 whitespace-nowrap font-display text-sm leading-relaxed tracking-tight text-muted-foreground sm:gap-x-3 sm:text-[1.0625rem] sm:tracking-normal md:mt-8 md:text-xl ${className}`}
      style={{fontWeight: 300}}
    >
      <span>Hand-woven Pashmina</span>

      <span className="hero-rotating-slot inline-flex shrink-0 items-baseline">
        <span className="hero-rotating-slot__sizer" aria-hidden>
          {LONGEST_WORD}
        </span>

        <span
          key={reduceMotion ? 'static' : `${index}-${activeWord}`}
          className="hero-rotating-slot__word"
          aria-hidden
        >
          {activeWord}
        </span>
      </span>

      <span className="shrink-0 text-foreground/85">— sent worldwide</span>

      <span className="sr-only">
        Hand-woven Kashmiri {WORDS.join(', ')} — sent worldwide
      </span>
    </p>
  );
}
