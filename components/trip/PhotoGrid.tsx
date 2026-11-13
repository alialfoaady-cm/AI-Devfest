"use client";
/* eslint-disable @next/next/no-img-element -- photos are data URLs or local samples; next/image adds nothing */

import { useState } from "react";
import { fileToPhoto } from "@/lib/inspection/images";
import { SLOT_LABELS, SLOTS, type Photos, type Slot } from "@/lib/types";

/** The six photo slots. Tapping a slot opens the phone camera or the file picker. */
export function PhotoGrid({
  photos,
  onChange,
  disabled = false,
}: {
  photos: Partial<Photos>;
  onChange: (slot: Slot, photo: string) => void;
  disabled?: boolean;
}) {
  const [error, setError] = useState("");

  async function pick(slot: Slot, file: File | undefined) {
    if (!file) return;
    try {
      setError("");
      onChange(slot, await fileToPhoto(file));
    } catch {
      setError(`The ${SLOT_LABELS[slot].toLowerCase()} photo could not be read. Try taking it again.`);
    }
  }

  return (
    <>
      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {SLOTS.map((slot) => (
          <li key={slot}>
            <label
              className={`relative block aspect-[4/3] overflow-hidden rounded-md bg-surface focus-within:outline-3 focus-within:outline-offset-2 focus-within:outline-lake ${
                photos[slot] ? "border border-line" : "border-2 border-dashed border-ink"
              } ${disabled ? "opacity-60" : "cursor-pointer"}`}
            >
              {photos[slot] ? (
                <img src={photos[slot]} alt={`${SLOT_LABELS[slot]} photo`} className="h-full w-full object-cover" />
              ) : (
                <span className="flex h-full flex-col items-center justify-center px-2 text-center">
                  <span className="font-display text-2xl font-semibold">{SLOT_LABELS[slot]}</span>
                  <span className="text-sm text-ink-soft">Tap to take photo</span>
                </span>
              )}
              {photos[slot] && (
                <span className="absolute left-0 top-0 rounded-br-md bg-ink px-2 py-0.5 text-sm font-medium text-white">
                  {SLOT_LABELS[slot]}
                </span>
              )}
              <input
                type="file"
                accept="image/*"
                capture="environment"
                className="sr-only"
                disabled={disabled}
                aria-label={`${photos[slot] ? "Replace" : "Take"} ${SLOT_LABELS[slot].toLowerCase()} photo`}
                onChange={(event) => {
                  pick(slot, event.target.files?.[0]);
                  event.target.value = "";
                }}
              />
            </label>
          </li>
        ))}
      </ul>
      {error && (
        <p role="alert" className="mt-2 font-medium text-flag">
          {error}
        </p>
      )}
    </>
  );
}
