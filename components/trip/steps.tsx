"use client";

// What a borrower does on a trip, in order: photograph the car, take the key, bring it back.

import { useEffect, useState } from "react";
import { IMPACT_LABEL, RENTAL_COST_PER_DAY_USD_ESTIMATE } from "@/lib/config";
import { plural } from "@/lib/format";
import { compareInspection, inspectionProvider } from "@/lib/inspection/client";
import { slotVerdict } from "@/lib/inspection/verdict";
import { lockerCode } from "@/lib/inspections";
import { SAMPLE_PICKUP_PHOTOS, SAMPLE_RETURN_PHOTOS } from "@/lib/sampleData";
import { act, useTask } from "@/lib/store";
import { SLOT_LABELS, SLOTS, type InspectionResult, type Photos, type Slot } from "@/lib/types";
import { LockOpen } from "@phosphor-icons/react";
import { Notice, btnPrimary, btnQuiet, card, cardLabel, heading } from "../ui";
import { PhotoSet, type SlotStatus } from "./PhotoSet";

/** True while the AI is the mock: only then are the drawn sample photos offered, to try the flow without a car. */
function useMockMode(): boolean {
  const [mock, setMock] = useState(false);
  useEffect(() => {
    inspectionProvider().then((provider) => setMock(provider === "mock"));
  }, []);
  return mock;
}

const stillNeeded = (missing: Slot[]) => `Still needed: ${missing.map((slot) => SLOT_LABELS[slot].toLowerCase()).join(", ")}.`;

export function PickupPhotos({ bookingId }: { bookingId: string }) {
  const [photos, setPhotos] = useState<Partial<Photos>>({});
  const { busy, error, run } = useTask();
  const mock = useMockMode();
  const missing = SLOTS.filter((slot) => !photos[slot]);

  return (
    <section aria-labelledby="pickup-heading">
      <h2 id="pickup-heading" className={heading}>
        Photograph it before you drive
      </h2>
      <p className="mb-3 mt-1 text-ink-soft">Six photos record the car as you found it. They unlock the key locker.</p>
      <PhotoSet photos={photos} onChange={(slot, photo) => setPhotos((current) => ({ ...current, [slot]: photo }))} />
      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        <button
          type="button"
          className={btnPrimary}
          disabled={missing.length > 0 || busy}
          onClick={() => run(() => act("savePickup", { bookingId, photos }))}
        >
          {busy ? "Saving photos" : "Save photos and get the key code"}
        </button>
        {mock && (
          <button type="button" className={btnQuiet} onClick={() => setPhotos(SAMPLE_PICKUP_PHOTOS)}>
            Use sample photos
          </button>
        )}
      </div>
      {missing.length > 0 && <p className="mt-2 text-sm text-ink-soft">{stillNeeded(missing)}</p>}
      <div className="mt-3">
        <Notice>{error}</Notice>
      </div>
    </section>
  );
}

export function KeyCode({ bookingId }: { bookingId: string }) {
  const code = lockerCode(bookingId);
  return (
    <section aria-labelledby="key-heading" className={`${card} p-4 sm:p-5`}>
      <h2 id="key-heading" className={`${cardLabel} text-green-ink`}>
        <LockOpen size={20} weight="fill" aria-hidden />
        Key locker code
      </h2>
      <p className="mt-3 flex gap-2.5" aria-label={`Code ${code.split("").join(" ")}`}>
        {code.split("").map((digit, index) => (
          <span
            key={index}
            aria-hidden
            style={{ "--i": index } as React.CSSProperties}
            className="enter flex h-18 w-14.5 items-center justify-center rounded-xl border border-green-ink/40 bg-surface-2 text-[2.75rem] font-bold tabular-nums text-green-ink"
          >
            {digit}
          </span>
        ))}
      </p>
      <p className="mt-3 text-sm text-ink-soft">
        Unlocked by your pickup photos. The code is made up for this demo: there is no real locker yet.
      </p>
    </section>
  );
}

const allWaiting = () => Object.fromEntries(SLOTS.map((slot) => [slot, "waiting"])) as Record<Slot, SlotStatus>;

export function ReturnCheck({ bookingId, pickupPhotos }: { bookingId: string; pickupPhotos: Photos }) {
  const [photos, setPhotos] = useState<Partial<Photos>>({});
  const [status, setStatus] = useState<Record<Slot, SlotStatus> | null>(null); // set while comparing
  const [error, setError] = useState("");
  const mock = useMockMode();
  const missing = SLOTS.filter((slot) => !photos[slot]);
  const checking = status && SLOTS.find((slot) => status[slot] === "checking");

  async function checkAndReturn() {
    const complete = photos as Photos;
    setError("");
    setStatus(allWaiting());
    try {
      const results = {} as Record<Slot, InspectionResult | null>;
      // One pair at a time: steady progress on screen, and no burst against a rate limit.
      for (const slot of SLOTS) {
        setStatus((current) => ({ ...current!, [slot]: "checking" }));
        results[slot] = await compareInspection(pickupPhotos[slot], complete[slot], slot);
        setStatus((current) => ({ ...current!, [slot]: slotVerdict(results[slot]) }));
      }
      await new Promise((resolve) => setTimeout(resolve, 600)); // let the last verdict be seen
      await act("saveReturn", { bookingId, photos: complete, aiResult: results });
    } catch (problem) {
      setError(problem instanceof Error ? problem.message : "The return did not go through. Try again.");
      setStatus(null);
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

      <PhotoSet
        photos={photos}
        status={status ?? undefined}
        onChange={(slot, photo) => setPhotos((current) => ({ ...current, [slot]: photo }))}
      />

      {status ? (
        <p className="mt-4 font-medium" role="status">
          {checking ? `Comparing the ${SLOT_LABELS[checking].toLowerCase()} photos.` : "All six pairs compared."}
        </p>
      ) : (
        <>
          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            <button type="button" className={btnPrimary} disabled={missing.length > 0} onClick={checkAndReturn}>
              Check photos and return the car
            </button>
            {mock && (
              <button type="button" className={btnQuiet} onClick={() => setPhotos(SAMPLE_RETURN_PHOTOS)}>
                Use sample photos
              </button>
            )}
          </div>
          {missing.length > 0 && <p className="mt-2 text-sm text-ink-soft">{stillNeeded(missing)}</p>}
        </>
      )}

      <div className="mt-3">
        <Notice>{error}</Notice>
      </div>
    </section>
  );
}

/** The dollar figure for judges. Its inputs are estimates and the screen says so. */
export function Savings({ days }: { days: number }) {
  return (
    <section aria-label="Impact" className="rounded-2xl bg-green p-5 text-on-green sm:p-6">
      <p className="text-5xl font-bold leading-none tracking-tight tabular-nums">${days * RENTAL_COST_PER_DAY_USD_ESTIMATE}</p>
      <p className="mt-1.5 text-lg font-semibold">{IMPACT_LABEL}</p>
      <p>
        {plural(days, "day")} at about ${RENTAL_COST_PER_DAY_USD_ESTIMATE} a day for a rental car. No money changed hands.
      </p>
    </section>
  );
}
