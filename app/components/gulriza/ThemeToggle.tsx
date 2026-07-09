import {MonitorSmartphone, Moon, Sun} from 'lucide-react';
import {useTheme} from '~/lib/theme';

/**
 * The Kashmir Weaver — theme toggle.
 *
 * Cycles `system → light → dark → system`. The icon shows what the
 * click will do (next mode), not the current state, so the affordance
 * reads "Moon = switch to dark", "Sun = switch to light",
 * "MonitorSmartphone = back to system".
 *
 * Visual style mirrors the existing nav icon buttons in `SiteHeader.tsx`
 * (h-[18px] w-[18px] strokeWidth={1}, 11px min-h/w tap targets).
 */
export function ThemeToggle() {
  const {mode, cycle} = useTheme();
  const next = nextLabelFor(mode);
  const Icon = iconForMode(mode);

  return (
    <button
      type="button"
      onClick={cycle}
      aria-label={`Theme: ${labelForMode(mode)}. ${next}`}
      title={`Theme: ${labelForMode(mode)} — ${next}`}
      data-theme-mode={mode}
      className="touch-target inline-flex min-h-11 min-w-11 items-center justify-center text-muted-foreground transition hover:text-foreground active:opacity-80"
    >
      <Icon className="h-[18px] w-[18px]" strokeWidth={1} />
    </button>
  );
}

function labelForMode(mode: 'system' | 'light' | 'dark'): string {
  if (mode === 'system') return 'System';
  if (mode === 'light') return 'Light';
  return 'Dark';
}

function nextLabelFor(mode: 'system' | 'light' | 'dark'): string {
  if (mode === 'system') return 'Click to switch to light';
  if (mode === 'light') return 'Click to switch to dark';
  return 'Click to switch back to system';
}

function iconForMode(mode: 'system' | 'light' | 'dark') {
  // The icon advertises the next mode the user is moving *to*.
  if (mode === 'light') return Moon;
  if (mode === 'dark') return MonitorSmartphone;
  return Sun;
}
