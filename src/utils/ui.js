// Shared Tailwind class strings pulled from the existing components
// (AddHabitModal, Settings) so new pages match the current dark theme
// instead of re-deriving their own look.

export const panelClass = 'bg-panel border border-panel-border rounded-2xl p-4 sm:p-5';

export const inputClass =
  'w-full bg-cell border border-cell-border rounded-lg px-3 py-2 text-sm text-text placeholder:text-text-dim outline-none focus:border-accent transition-colors';

export const labelClass = 'block text-[10px] uppercase tracking-wider text-text-dim mb-1.5';

export const primaryButtonClass =
  'px-3.5 py-2 rounded-lg text-xs font-medium bg-accent text-bg hover:brightness-110 transition-all disabled:opacity-50 disabled:cursor-not-allowed';

export const secondaryButtonClass =
  'px-3.5 py-2 rounded-lg text-xs font-medium text-text-muted hover:text-text hover:bg-panel-soft transition-colors';

export const dangerButtonClass =
  'p-1.5 rounded-lg text-text-muted hover:text-week-4 hover:bg-panel-soft transition-colors';

export const iconButtonClass =
  'p-1.5 rounded-lg text-text-muted hover:text-text hover:bg-panel-soft transition-colors';
