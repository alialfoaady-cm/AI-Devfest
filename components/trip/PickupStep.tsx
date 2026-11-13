"use client";

import { useState } from "react";
import { savePickup } from "@/lib/inspections";
import { SAMPLE_PICKUP_PHOTOS } from "@/lib/sampleData";
import { update } from "@/lib/store";
import type { Photos } from "@/lib/types";
import { btnPrimary, heading } from "../ui";
import { PhotoGrid } from "./PhotoGrid";

export function PickupStep({ bookingId }: { bookingId: string }) {
  // Preloaded for the demo. Replace any of them by tapping it.
  const [photos, setPhotos] = useState<Photos>(SAMPLE_PICKUP_PHOTOS);

  return (
    <section aria-labelledby="pickup-heading">
      <h2 id="pickup-heading" className={heading}>
        Pickup photos
      </h2>
      <p className="mb-3 mt-1 text-ink-soft">
        Six photos record the car as you found it. Sample photos are loaded; tap one to replace it with your own.
      </p>
      <PhotoGrid photos={photos} onChange={(slot, photo) => setPhotos({ ...photos, [slot]: photo })} />
      <button
        type="button"
        className={`${btnPrimary} mt-4 w-full`}
        onClick={() => update((state) => savePickup(state, bookingId, photos))}
      >
        Save photos and get locker code
      </button>
    </section>
  );
}
