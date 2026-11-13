// The few parts every screen is built from.
/* eslint-disable @next/next/no-img-element -- car photos come from the camera or the server, already sized */
import { Car as CarIcon, type Icon } from "@phosphor-icons/react";
import type { ReactNode } from "react";

const button =
  "inline-flex h-12 shrink-0 items-center justify-center gap-2 rounded-lg px-5 text-center font-medium transition-[background-color,opacity,scale] duration-150 ease-out active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40 disabled:active:scale-100";

/** The one action a screen is for. */
export const btnPrimary = `${button} bg-green text-on-green shadow-[inset_0_1px_0_rgb(255_255_255/0.35),inset_0_-1px_0_rgb(0_0_0/0.1)] hover:bg-green-press`;
/** A second action that still matters: black on light, white on dark. */
export const btnStrong = `${button} bg-ink text-canvas hover:opacity-85`;
/** Everything else. */
export const btnQuiet = `${button} bg-surface text-ink hover:bg-surface-2`;

export const card = "rounded-xl border border-line bg-canvas";
export const pageTitle = "text-balance text-[2rem] font-extrabold leading-[1.16] tracking-[-0.024em] sm:text-[2.375rem]";
/** A car's name on a card: 21/28, heaviest weight. Weight, not size, sets it apart from the grey line under it. */
export const cardTitle = "text-[1.3125rem] font-extrabold leading-7 tracking-[-0.014em]";
/** A car on a grid: a 3:2 photo and a few lines under it, with no box around them. */
export const carGrid = "grid gap-x-4 gap-y-10 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4";
export const carPhoto = "aspect-[3/2] w-full rounded-xl";
export const heading = "text-xl font-bold leading-tight tracking-tight sm:text-2xl";
export const field =
  "mt-1.5 block h-14 w-full rounded-lg bg-surface px-4 text-ink placeholder:text-ink-soft focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ink";

const TONES = {
  green: "bg-green text-on-green",
  soft: "bg-green-soft text-green-ink",
  quiet: "bg-surface text-ink-soft",
  amber: "bg-amber-soft text-amber",
  red: "bg-red-soft text-red",
};

export function Pill({ tone, children }: { tone: keyof typeof TONES; children: ReactNode }) {
  return (
    <span className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-3 py-1 text-sm font-medium ${TONES[tone]}`}>
      {children}
    </span>
  );
}

/** Something went wrong, or needs doing before the person can go on. */
export function Notice({ tone = "red", children }: { tone?: "red" | "amber"; children: ReactNode }) {
  if (!children) return null;
  return (
    <p role={tone === "red" ? "alert" : undefined} className={`rounded-lg px-3.5 py-2.5 font-medium ${TONES[tone]}`}>
      {children}
    </p>
  );
}

/** The car's picture, or a plain tile when its owner has not added one. */
export function CarPhoto({ photo, model, className = "" }: { photo?: string; model: string; className?: string }) {
  return photo ? (
    <img src={photo} alt={model} className={`bg-surface object-cover ${className}`} />
  ) : (
    <span className={`flex items-center justify-center bg-surface text-ink-soft ${className}`}>
      <CarIcon size={40} weight="light" aria-label={`${model}, no photo yet`} />
    </span>
  );
}

/** A person, as the first letter of their name. */
export function Initial({ name }: { name: string }) {
  return (
    <span aria-hidden className="grid size-7 shrink-0 place-items-center rounded-full bg-ink text-sm font-semibold text-canvas">
      {name.slice(0, 1).toUpperCase()}
    </span>
  );
}

/** Nothing here yet: what this place is for, and the one thing to do about it. */
export function Empty({ icon: IconCmp, title, children, action }: { icon: Icon; title: string; children: ReactNode; action?: ReactNode }) {
  return (
    <div className="rounded-xl bg-surface px-6 py-10 text-center sm:py-14">
      <IconCmp size={40} weight="light" className="mx-auto text-ink-soft" aria-hidden />
      <h2 className="mt-4 text-xl font-bold tracking-tight">{title}</h2>
      <p className="mx-auto mt-1.5 max-w-md text-ink-soft">{children}</p>
      {action && <div className="mt-6 flex flex-wrap justify-center gap-2">{action}</div>}
    </div>
  );
}

/**
 * One part of a search bar: a small label over a native control, as on a booking site.
 * Put several in a `searchBar` row.
 */
export const searchBar =
  "grid divide-y divide-line overflow-hidden rounded-xl border border-line bg-canvas sm:grid-flow-col sm:auto-cols-fr sm:divide-x sm:divide-y-0";

export function Segment({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block px-4 py-2 transition-colors duration-150 focus-within:bg-surface focus-within:outline-2 focus-within:-outline-offset-2 focus-within:outline-ink hover:bg-surface">
      <span className="block text-xs font-medium leading-4 text-ink-soft">{label}</span>
      {children}
    </label>
  );
}
export const segmentControl = "block h-6 w-full bg-transparent text-ink outline-none";
