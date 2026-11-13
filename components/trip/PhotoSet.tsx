"use client";
/* eslint-disable @next/next/no-img-element -- photos are data URLs or local samples; next/image adds nothing */

import { Camera, CheckCircle } from "@phosphor-icons/react";
import { useState } from "react";
import { fileToPhoto } from "@/lib/inspection/images";
import type { Verdict } from "@/lib/inspection/verdict";
import { SLOT_LABELS, SLOTS, type Photos, type Slot } from "@/lib/types";
import { VERDICT, VerdictPill } from "../report/verdicts";

/** What a slot shows while the return photos are being compared. */
export type SlotStatus = "waiting" | "checking" | Verdict;

/** The six photos of a car. Tapping a tile opens the phone camera or the file picker. */
export function PhotoSet({
  photos,
  onChange,
  status,
}: {
  photos: Partial<Photos>;
  onChange: (slot: Slot, photo: string) => void;
  /** Set while comparing: locks the tiles and shows each one's progress. */
  status?: Record<Slot, SlotStatus>;
}) {
  const [error, setError] = useState("");

  async function pick(slot: Slot, file: File | undefined) {
    if (!file) return;
    try {
      setError("");
      onChange(slot, await fileToPhoto(file));
    } catch {
      setError(`The ${SLOT_LABELS[slot].toLowerCase()} photo could not be read. Take it again.`);
    }
  }

  return (
    <>
      <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {SLOTS.map((slot) => {
          const photo = photos[slot];
          const state = status?.[slot];
          const verdict = state && state !== "waiting" && state !== "checking" ? state : null;
          return (
            <li key={slot}>
              <label
                className={`relative block aspect-[4/3] overflow-hidden rounded-xl border bg-surface-2 [container-type:size] has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-ink ${
                  photo ? "border-green-ink/60" : "border-dashed border-ink-soft/60"
                } ${status ? "" : "cursor-pointer"} ${verdict ? VERDICT[verdict].border : ""}`}
              >
                {photo ? (
                  <img
                    src={photo}
                    alt={`${SLOT_LABELS[slot]} photo`}
                    className={`size-full object-cover transition-opacity duration-200 ${state === "waiting" ? "opacity-40" : ""}`}
                  />
                ) : (
                  <span className="flex size-full flex-col items-center justify-center gap-1 text-center">
                    <Camera size={26} weight="fill" className="text-green-ink" aria-hidden />
                    <span className="font-medium">{SLOT_LABELS[slot]}</span>
                  </span>
                )}
                {photo && (
                  <span className="absolute left-1.5 top-1.5 flex items-center gap-1 rounded-full bg-green py-0.5 pl-1.5 pr-2.5 text-sm font-semibold text-on-green">
                    <CheckCircle size={16} weight="fill" aria-hidden />
                    {SLOT_LABELS[slot]}
                  </span>
                )}
                {state === "checking" && <span aria-hidden className="scan absolute inset-x-0 top-0 h-0.5 bg-green" />}
                {verdict && (
                  <span className="pop absolute bottom-1.5 left-1.5">
                    <VerdictPill verdict={verdict} short />
                  </span>
                )}
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="sr-only"
                  disabled={Boolean(status)}
                  aria-label={`${photo ? "Replace" : "Take"} ${SLOT_LABELS[slot].toLowerCase()} photo`}
                  onChange={(event) => {
                    pick(slot, event.target.files?.[0]);
                    event.target.value = "";
                  }}
                />
              </label>
            </li>
          );
        })}
      </ul>
      {error && (
        <p role="alert" className="mt-2 font-medium text-red">
          {error}
        </p>
      )}
    </>
  );
}
