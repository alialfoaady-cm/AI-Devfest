"use client";

import { useState } from "react";
import { compareInspection, inspectionProvider } from "@/lib/inspection/client";
import { saveReturn } from "@/lib/inspections";
import { SAMPLE_RETURN_PHOTOS } from "@/lib/sampleData";
import { update } from "@/lib/store";
import { SLOT_LABELS, SLOTS, type InspectionResult, type Photos, type Slot } from "@/lib/types";
import { btnPrimary, btnQuiet, heading } from "../ui";
import { PhotoGrid } from "./PhotoGrid";

export function ReturnStep({ bookingId, pickupPhotos }: { bookingId: string; pickupPhotos: Photos }) {
  const [photos, setPhotos] = useState<Partial<Photos>>({});
  const [checking, setChecking] = useState<number | null>(null); // index of the slot being checked
  const [error, setError] = useState("");
  const missing = SLOTS.filter((slot) => !photos[slot]);

  async function checkAndReturn() {
    const complete = photos as Photos;
    setError("");
    try {
      const provider = await inspectionProvider();
      const results = {} as Record<Slot, InspectionResult | null>;
      // One pair at a time: steady progress on screen, and no burst against a rate limit.
      for (const [index, slot] of SLOTS.entries()) {
        setChecking(index);
        results[slot] = await compareInspection(pickupPhotos[slot], complete[slot], slot);
      }
      update((state) => saveReturn(state, bookingId, complete, results, provider));
    } catch (problem) {
      setError(problem instanceof Error ? problem.message : "The return did not go through. Try again.");
      setChecking(null);
    }
  }

  return (
    <section aria-labelledby="return-heading">
      <h2 id="return-heading" className={heading}>
        Return photos
      </h2>
      <p className="mb-3 mt-1 text-ink-soft">
        Back at the airport, take the same six photos. Each one is compared with its pickup photo.
      </p>

      <PhotoGrid
        photos={photos}
        disabled={checking !== null}
        onChange={(slot, photo) => setPhotos((current) => ({ ...current, [slot]: photo }))}
      />

      {checking === null ? (
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <button type="button" className={btnQuiet} onClick={() => setPhotos(SAMPLE_RETURN_PHOTOS)}>
            Use sample return photos
          </button>
          <button type="button" className={btnPrimary} disabled={missing.length > 0} onClick={checkAndReturn}>
            Check photos and return car
          </button>
          {missing.length > 0 && (
            <p className="text-sm text-ink-soft sm:col-span-2">
              Still needed: {missing.map((slot) => SLOT_LABELS[slot].toLowerCase()).join(", ")}.
            </p>
          )}
        </div>
      ) : (
        <div className="mt-4" role="status">
          <p className="font-medium">
            Comparing {SLOT_LABELS[SLOTS[checking]].toLowerCase()} photos, {checking + 1} of {SLOTS.length}
          </p>
          <div className="mt-2 h-3 overflow-hidden rounded-full bg-line">
            <div
              className="h-full bg-lake transition-[width] duration-300"
              style={{ width: `${((checking + 0.5) / SLOTS.length) * 100}%` }}
            />
          </div>
        </div>
      )}

      {error && (
        <p role="alert" className="mt-3 rounded-md border-2 border-flag bg-flag-tint px-3 py-2 font-medium text-flag">
          {error}
        </p>
      )}
    </section>
  );
}
