/** Shared class names for account forms and actions. */
export const accountInputClass =
  'mt-2 w-full border bg-transparent px-3 py-2.5 text-sm focus:outline-none focus:border-accent';

export const accountInputStyle = {borderColor: 'var(--border)'} as const;

export const accountButtonClass =
  'tracked mt-4 border px-6 py-2.5 text-xs uppercase tracking-[0.2em] transition hover:text-accent disabled:opacity-50';

export const accountButtonStyle = {borderColor: 'var(--border)'} as const;

export const accountPrimaryButtonClass =
  'tracked mt-4 px-6 py-2.5 text-xs uppercase tracking-[0.2em] transition hover:opacity-90 disabled:opacity-50';

export const accountPrimaryButtonStyle = {
  background: 'var(--accent)',
  color: 'var(--background)',
} as const;

export const accountFieldsetClass = 'space-y-4 border p-6';
export const accountFieldsetStyle = {borderColor: 'var(--border)'} as const;

export const accountLegendClass = 'tracked text-accent text-xs uppercase tracking-[0.25em]';

export const accountLabelClass = 'block text-xs uppercase tracking-[0.2em] text-muted-foreground';
