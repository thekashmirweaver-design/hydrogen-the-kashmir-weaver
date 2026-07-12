import {heroDark, heroLight} from '~/lib/hero-image-urls';

/**
 * Inline FOUC-blocker body. Injected as a raw <script> in entry.server
 * (not as a React child) so React hydration never tries to claim it.
 *
 * Updates React-owned #tkw-hero-preload in place — never appendChild a new
 * head node (that shifted siblings and broke hydration).
 */
export function getThemeBootScriptBody(): string {
  return `(function(){try{var KEY='tkw-theme';var stored=null;try{stored=window.localStorage.getItem(KEY)}catch(e){stored=null}var mode=(stored==='light'||stored==='dark'||stored==='system')?stored:'system';var systemLight=(window.matchMedia&&window.matchMedia('(prefers-color-scheme: light)').matches);var resolved=(mode==='light'||mode==='dark')?mode:(systemLight?'light':'dark');var root=document.documentElement;root.setAttribute('data-theme',resolved);root.setAttribute('data-theme-mode',mode);root.style.colorScheme=resolved;var darkAvif=${JSON.stringify(heroDark.avif)};var darkAvifSmall=${JSON.stringify(heroDark.avifSmall)};var lightAvif=${JSON.stringify(heroLight.avif)};var lightAvifSmall=${JSON.stringify(heroLight.avifSmall)};var full=resolved==='light'?lightAvif:darkAvif;var small=resolved==='light'?lightAvifSmall:darkAvifSmall;var link=document.getElementById('tkw-hero-preload');if(!link){link=document.createElement('link');link.id='tkw-hero-preload';document.head.appendChild(link)}link.rel='preload';link.as='image';link.type='image/avif';link.setAttribute('imagesrcset',small+' 800w, '+full+' 1536w');link.setAttribute('imagesizes','(min-width: 768px) 55vw, 100vw');link.fetchPriority='high'}catch(e){}})();`;
}

/** Full tag for entry.server injection immediately before </head>. */
export function getThemeBootScriptTag(nonce: string): string {
  const body = getThemeBootScriptBody();
  // Nonce is hex from Hydrogen CSP — still escape quotes defensively.
  const safeNonce = nonce.replace(/"/g, '');
  return `<script id="tkw-theme-boot" nonce="${safeNonce}">${body}</script>`;
}

/** Placeholder claimed by React; boot script fills imagesrcset before paint. */
export function HeroPreloadLink() {
  return (
    <link
      id="tkw-hero-preload"
      rel="preload"
      as="image"
      type="image/avif"
      suppressHydrationWarning
    />
  );
}
