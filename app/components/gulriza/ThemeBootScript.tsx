import {Script} from '@shopify/hydrogen';

/**
 * Inline FOUC-blocker. Runs synchronously in <head> before paint, reads
 * either the stored preference or the OS preference, and sets the
 * <html data-theme="…" data-theme-mode="…" color-scheme="…"> attributes
 * the ThemeProvider then takes over.
 *
 * The script body is intentionally terse and Side-effect free. It only
 * touches document.documentElement attributes + localStorage. No global
 * lookups, no eval, no DOM mutation beyond the three attributes.
 */
const bootScriptBody = `
(function () {
  try {
    var KEY = 'tkw-theme';
    var stored = null;
    try { stored = window.localStorage.getItem(KEY); } catch (e) { stored = null; }
    var mode = (stored === 'light' || stored === 'dark' || stored === 'system') ? stored : 'system';
    var systemLight = (window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches);
    var resolved = (mode === 'light' || mode === 'dark') ? mode : (systemLight ? 'light' : 'dark');
    var root = document.documentElement;
    root.setAttribute('data-theme', resolved);
    root.setAttribute('data-theme-mode', mode);
    root.style.colorScheme = resolved;
  } catch (e) {
    /* swallow — defaults apply */
  }
})();
`;

export function ThemeBootScript() {
  return (
    <Script
      // Hydrogen's <Script> dedupes by id across renders; the boot script
      // is mounted exactly once near the document <head>.
      id="tkw-theme-boot"
    >
      {bootScriptBody}
    </Script>
  );
}
