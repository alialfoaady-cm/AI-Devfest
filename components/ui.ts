// Shared class strings, so buttons and panels look the same on every screen.
const button =
  "inline-flex min-h-12 items-center justify-center gap-2 rounded-md px-5 text-center font-semibold transition-colors duration-150 disabled:cursor-not-allowed disabled:opacity-50";

export const btnPrimary = `${button} bg-lane text-ink hover:bg-lane-deep`;
export const btnQuiet = `${button} border-2 border-ink bg-surface text-ink hover:bg-concrete`;
export const panel = "rounded-lg border border-line bg-surface";
export const heading = "font-display text-3xl font-bold leading-tight";
export const field =
  "mt-1 block min-h-12 w-full rounded-md border-2 border-ink bg-surface px-3 text-base text-ink";
