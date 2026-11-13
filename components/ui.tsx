// The few parts every screen is built from.
/* eslint-disable @next/next/no-img-element -- car photos come from the camera or the server, already sized */
import { Car as CarIcon, type Icon } from "@phosphor-icons/react";
import type { ReactNode } from "react";

const button =
  "inline-flex h-13 shrink-0 items-center justify-center gap-2 rounded-[14px] px-5 text-center font-semibold transition-[background-color,opacity,scale] duration-150 ease-out active:scale-[0.98] active:opacity-85 disabled:cursor-not-allowed disabled:opacity-40 disabled:active:scale-100";

/** The one action a screen is for: solid green. */
export const btnPrimary = `${button} bg-green text-on-green hover:bg-green-press`;
/** Every other action: green outline on a green tint. */
export const btnQuiet = `${button} border border-green-ink/60 bg-green-soft text-green-ink hover:bg-green-ink/20`;

export const card = "rounded-2xl border border-line bg-surface";
export const pageTitle = "text-balance text-[2rem] font-extrabold leading-[1.16] tracking-[-0.024em] sm:text-[2.375rem]";
/** A car's name on a card: 21/28, heaviest weight. Weight, not size, sets it apart from the grey line under it. */
export const cardTitle = "text-[1.3125rem] font-extrabold leading-7 tracking-[-0.014em]";
/** Cars on a grid. Each is a `carCard`: a 3:2 photo over a few lines and one button. */
export const carGrid = "grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4";
export const carCard = `${card} flex flex-col overflow-hidden`;
export const carPhoto = "aspect-[3/2] w-full rounded-2xl";
/** The name of a card, with an icon in front: usually green. */
export const cardLabel = "flex items-center gap-2 text-lg font-semibold leading-tight";
export const heading = "text-xl font-bold leading-tight tracking-tight sm:text-2xl";
export const field =
  "mt-1.5 block h-14 w-full rounded-xl bg-surface-2 px-4 text-ink placeholder:text-ink-soft focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ink";

const TONES = {
  green: "bg-green-soft text-green-ink",
  soft: "bg-green-soft text-green-ink",
  quiet: "bg-ink-soft/15 text-ink-soft",
  amber: "bg-amber-soft text-amber",
  red: "bg-red-soft text-red",
};

export function Pill({ tone, children }: { tone: keyof typeof TONES; children: ReactNode }) {
  return (
    <span className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-3 py-1 text-sm font-semibold ${TONES[tone]}`}>
      {children}
    </span>
  );
}

/** Something went wrong, or needs doing before the person can go on. */
export function Notice({ tone = "red", children }: { tone?: "red" | "amber"; children: ReactNode }) {
  if (!children) return null;
  return (
    <p role={tone === "red" ? "alert" : undefined} className={`rounded-xl px-3.5 py-2.5 font-medium ${TONES[tone]}`}>
      {children}
    </p>
  );
}

/** The car's picture, or a plain tile when its owner has not added one. */
/** Garage interiors the demo cars are parked in. Sources in public/cars/CREDITS.md. */
const GARAGES = ["/cars/garage-1.jpg", "/cars/garage-2.jpg", "/cars/garage-3.jpg"];

export function CarPhoto({ photo, model, id = "", className = "" }: { photo?: string; model: string; id?: string; className?: string }) {
  // The demo listings' photos (public/cars) are cutouts with no background. Each is parked, whole and
  // centred, in a real garage (softened backdrop photos, also in public/cars), grounded by two shadows.
  if (photo?.startsWith("/cars/")) {
    // A demo car's id ends in its place in its airport's row, so cycling by it mixes the garages in every row.
    const garage = GARAGES[Number(/\d+$/.exec(id)?.[0] ?? 0) % GARAGES.length];
    return (
      <span className={`relative block overflow-hidden bg-surface ${className}`}>
        <img src={garage} alt="" aria-hidden loading="lazy" className="absolute inset-0 size-full object-cover object-[50%_60%]" />
        <span aria-hidden className="absolute inset-0 bg-[radial-gradient(ellipse_90%_80%_at_50%_45%,transparent_45%,rgb(0_0_0/0.4))]" />
        <span aria-hidden className="absolute bottom-[14%] left-1/2 h-[11%] w-[82%] -translate-x-1/2 rounded-[50%] bg-black/50 blur-[12px]" />
        <span aria-hidden className="absolute bottom-[18%] left-1/2 h-[4%] w-[68%] -translate-x-1/2 rounded-[50%] bg-black/70 blur-[5px]" />
        <img src={photo} alt={model} className="absolute bottom-[19%] left-1/2 h-[62%] w-[84%] -translate-x-1/2 object-contain object-bottom" />
      </span>
    );
  }
  return photo ? (
    <img src={photo} alt={model} className={`bg-surface object-cover ${className}`} />
  ) : (
    <span className={`flex items-center justify-center bg-green-soft text-green-ink ${className}`}>
      <CarIcon size={40} weight="fill" aria-label={`${model}, no photo yet`} />
    </span>
  );
}

/** A person, as the first letter of their name. */
export function Initial({ name }: { name: string }) {
  return (
    <span aria-hidden className="grid size-7 shrink-0 place-items-center rounded-full bg-green-soft text-sm font-semibold text-green-ink">
      {name.slice(0, 1).toUpperCase()}
    </span>
  );
}

/** Nothing here yet: what this place is for, and the one thing to do about it. */
export function Empty({ icon: IconCmp, title, children, action }: { icon: Icon; title: string; children: ReactNode; action?: ReactNode }) {
  return (
    <div className={`${card} px-6 py-10 text-center sm:py-14`}>
      <IconCmp size={40} weight="fill" className="mx-auto text-green-ink" aria-hidden />
      <h2 className="mt-4 text-xl font-bold tracking-tight">{title}</h2>
      <p className="mx-auto mt-1.5 max-w-md text-ink-soft">{children}</p>
      {action && <div className="mt-6 flex flex-wrap justify-center gap-2">{action}</div>}
    </div>
  );
}

/**
 * A search bar: one long pill. Each part is a small label over a value: <Select variant="segment"> for
 * a dropdown, <DateRange> for a pair of days. The bar dims while one part is in use, and that
 * part lifts out of it. On phones the parts stack.
 */
export const searchBar =
  "group/search grid rounded-[2rem] border border-line bg-surface shadow-[0_8px_24px_rgb(0_0_0/0.08)] transition-colors duration-200 focus-within:bg-surface-2 " +
  "*:rounded-[2rem] sm:grid-flow-col sm:auto-cols-fr sm:rounded-full sm:*:rounded-full";
export const segmentShape = "px-6 py-[15px] text-left transition-[background-color,box-shadow] duration-200";
export const segmentLabel = "block text-xs font-semibold leading-4";
