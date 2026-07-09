/**
 * Inline FOUC-blocker. Must run synchronously in <head> before paint.
 * Reads `tkw-theme` from localStorage (or OS preference) and sets
 * <html data-theme / data-theme-mode / color-scheme> for ThemeProvider.
 *
 * Uses a plain <script> (not Hydrogen <Script>) so the browser executes it
 * immediately while parsing head — required for persistence across reloads.
 */
const bootScriptBody = `(function(){try{var KEY='tkw-theme';var stored=null;try{stored=window.localStorage.getItem(KEY)}catch(e){stored=null}var mode=(stored==='light'||stored==='dark'||stored==='system')?stored:'system';var systemLight=(window.matchMedia&&window.matchMedia('(prefers-color-scheme: light)').matches);var resolved=(mode==='light'||mode==='dark')?mode:(systemLight?'light':'dark');var root=document.documentElement;root.setAttribute('data-theme',resolved);root.setAttribute('data-theme-mode',mode);root.style.colorScheme=resolved}catch(e){}})();`;

export function ThemeBootScript({nonce}: {nonce?: string}) {
  return (
    <script
      id="tkw-theme-boot"
      // Blocking inline script — must not be async/defer.
      suppressHydrationWarning
      nonce={nonce}
      dangerouslySetInnerHTML={{__html: bootScriptBody}}
    />
  );
}
