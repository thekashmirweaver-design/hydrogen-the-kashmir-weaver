import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";

/**
 * The Kashmir Weaver — theme controller.
 *
 * Three states for the user: `light`, `dark`, `system`. The `system` mode
 * defers to the OS via `prefers-color-scheme`. The visible (rendered)
 * value, called `resolved`, is what we paint on `<html data-theme>`.
 *
 * Storage + the boot script use the same `tkw-theme` localStorage key.
 * The provider reads from the DOM attribute that the boot script sets so
 * there's no flash on first paint and no hydration mismatch.
 */

export type ThemeMode = "light" | "dark" | "system";
export type ResolvedTheme = "light" | "dark";

const STORAGE_KEY = "tkw-theme";
const VALID_MODES = new Set<ThemeMode>(["light", "dark", "system"]);

function isThemeMode(value: unknown): value is ThemeMode {
  return typeof value === "string" && VALID_MODES.has(value as ThemeMode);
}

function readStoredMode(): ThemeMode {
  if (typeof window === "undefined") return "system";
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return isThemeMode(raw) ? raw : "system";
  } catch {
    return "system";
  }
}

function readBootAttribute(name: string): string | null {
  if (typeof document === "undefined") return null;
  return document.documentElement.getAttribute(name);
}

function readResolvedFromDom(): ResolvedTheme {
  const v = readBootAttribute("data-theme");
  return v === "light" ? "light" : "dark";
}

function readBootModeFromDom(): ThemeMode {
  const v = readBootAttribute("data-theme-mode");
  return isThemeMode(v) ? v : "system";
}

function systemPreference(): ResolvedTheme {
  if (typeof window === "undefined" || !window.matchMedia) return "dark";
  return window.matchMedia("(prefers-color-scheme: light)").matches
    ? "light"
    : "dark";
}

function writeDom(mode: ThemeMode, resolved: ResolvedTheme) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  root.setAttribute("data-theme", resolved);
  root.setAttribute("data-theme-mode", mode);
  root.style.colorScheme = resolved;
}

function persist(mode: ThemeMode) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, mode);
  } catch {
    // localStorage may be unavailable (Safari private mode, etc.) — silently
    // skip persistence; the boot script's read on the next page-load will
    // then fall back to `system`.
  }
}

type ThemeContextValue = {
  /** User-selected mode. */
  mode: ThemeMode;
  /** Active rendered theme (mode resolved against OS preference). */
  resolved: ResolvedTheme;
  /** Cycle to the next mode in `system → light → dark → system`. */
  cycle: () => void;
  /** Set the mode explicitly. */
  setMode: (next: ThemeMode) => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

/**
 * Provider — installed once near the root of the tree. Stores the user
 * preference; reflects OS changes when mode === "system".
 */
export function ThemeProvider({children}: {children: ReactNode}) {
  // SSR-safe initial reads come from the DOM attribute that the boot
  // script set during the page load. Hydration is consistent because the
  // server renders without the attribute (defaults) and the client picks
  // up the boot result immediately.
  const [mode, setModeState] = useState<ThemeMode>(() => readBootModeFromDom());
  const [systemPref, setSystemPref] = useState<ResolvedTheme>(() =>
    typeof window === "undefined" ? "dark" : systemPreference(),
  );

  // Sync the OS-preference while in `system` mode.
  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mq = window.matchMedia("(prefers-color-scheme: light)");
    const onChange = (e: MediaQueryListEvent) =>
      setSystemPref(e.matches ? "light" : "dark");
    if (mq.addEventListener) mq.addEventListener("change", onChange);
    else mq.addListener(onChange); // legacy Safari
    return () => {
      if (mq.removeEventListener) mq.removeEventListener("change", onChange);
      else mq.removeListener(onChange);
    };
  }, []);

  const resolved: ResolvedTheme = mode === "system" ? systemPref : mode;

  // Apply DOM + storage + transition class whenever mode/resolved changes.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const root = document.documentElement;

    // If the new resolved theme differs from what's currently on <html>,
    // play the transition. (First paint has no previous; skip to avoid a
    // perceived flicker on hydration mismatch recovery.)
    const previous = readResolvedFromDom();
    if (previous !== resolved) {
      root.classList.add("theme-animating");
      writeDom(mode, resolved);
      const t = window.setTimeout(() => {
        root.classList.remove("theme-animating");
      }, 320);
      return () => {
        window.clearTimeout(t);
        root.classList.remove("theme-animating");
      };
    }

    writeDom(mode, resolved);
    return undefined;
  }, [mode, resolved]);

  const setMode = useCallback((next: ThemeMode) => {
    setModeState(next);
    persist(next);
  }, []);

  const cycle = useCallback(() => {
    setModeState((current) => {
      const order: ThemeMode[] = ["system", "light", "dark"];
      const next = order[(order.indexOf(current) + 1) % order.length];
      persist(next);
      return next;
    });
  }, []);

  const value = useMemo<ThemeContextValue>(
    () => ({mode, resolved, cycle, setMode}),
    [mode, resolved, cycle, setMode],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error("useTheme must be used within ThemeProvider");
  }
  return ctx;
}

/**
 * Re-render-on-system-change hook for components that want to reflect
 * OS preference without using the full provider (e.g. a marketing-page
 * decoration). Reads `prefers-color-scheme` reactively.
 */
export function useSystemTheme(): ResolvedTheme {
  return useSyncExternalStore(
    (notify) => {
      if (typeof window === "undefined" || !window.matchMedia) return () => {};
      const mq = window.matchMedia("(prefers-color-scheme: light)");
      const handler = () => notify();
      if (mq.addEventListener) mq.addEventListener("change", handler);
      else mq.addListener(handler);
      return () => {
        if (mq.removeEventListener) mq.removeEventListener("change", handler);
        else mq.removeListener(handler);
      };
    },
    () => systemPreference(),
    () => "dark",
  );
}
