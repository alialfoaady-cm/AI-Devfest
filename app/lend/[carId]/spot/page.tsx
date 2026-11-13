"use client";

import { Crosshair } from "@phosphor-icons/react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { ParkingMap } from "@/components/ParkingMap";
import { Notice, btnPrimary, btnQuiet, card, field, heading, pageTitle } from "@/components/ui";
import { AIRPORT_PARKING } from "@/lib/config";
import { act, useStore, useTask } from "@/lib/store";
import type { Car } from "@/lib/types";

export default function SpotPage() {
  const { carId } = useParams<{ carId: string }>();
  const { state, currentUserId } = useStore();
  const car = state.cars.find((c) => c.id === carId && c.ownerId === currentUserId);

  if (!car) {
    return (
      <div className={`${card} max-w-md p-5`}>
        <h1 className={heading}>This car is not yours to move</h1>
        <p className="my-3 text-ink-soft">Switch user at the top, or go back to your own cars.</p>
        <Link href="/lend" className={`${btnQuiet} w-full`}>
          Back to your cars
        </Link>
      </div>
    );
  }
  return <SpotEditor car={car} />;
}

function SpotEditor({ car }: { car: Car }) {
  const router = useRouter();
  const [pin, setPin] = useState(car.pin ?? AIRPORT_PARKING[car.airport]);
  const [spot, setSpot] = useState(car.spot ?? "");
  const [error, setError] = useState("");
  const save = useTask();

  function locate() {
    setError("");
    if (!navigator.geolocation) return setError("This browser cannot share a location. Drag the map instead.");
    navigator.geolocation.getCurrentPosition(
      (position) => setPin({ lat: position.coords.latitude, lng: position.coords.longitude }),
      () => setError("Location is off or blocked. Drag the map instead."),
      { enableHighAccuracy: true, timeout: 8000 },
    );
  }

  return (
    // Phones: question, map, then the form. From lg the map fills the right side.
    <section aria-labelledby="spot-heading" className="grid gap-5 lg:grid-cols-[minmax(0,24rem)_minmax(0,1fr)] lg:grid-rows-[auto_1fr] lg:gap-x-10">
      <div>
        <h1 id="spot-heading" className={pageTitle}>
          Where is the {car.model} parked?
        </h1>
        <p className="mt-2 text-ink-soft">Drag the map until the pin sits on your car. Your borrower sees exactly this.</p>
      </div>

      <ParkingMap
        center={pin}
        label={spot.trim()}
        onMove={setPin}
        className="h-[44dvh] min-h-64 lg:col-start-2 lg:row-span-2 lg:row-start-1 lg:h-[calc(100dvh-9.5rem)]"
      />

      <div className="space-y-3 lg:col-start-1">
        <button type="button" className={`${btnQuiet} w-full`} onClick={locate}>
          <Crosshair size={20} weight="bold" aria-hidden />
          Use my location
        </button>
        <Notice>{error || save.error}</Notice>

        <label className="block font-medium">
          Parking spot number
          <input
            className={`${field} text-lg font-semibold tabular-nums`}
            value={spot}
            onChange={(event) => setSpot(event.target.value)}
            maxLength={8}
            placeholder="B-214"
            autoComplete="off"
            aria-describedby="spot-help"
          />
          <span id="spot-help" className="mt-1.5 block text-sm font-normal text-ink-soft">
            The number painted on the bay or the nearest pillar. It rides on the pin.
          </span>
        </label>

        <button
          type="button"
          className={`${btnPrimary} w-full`}
          disabled={save.busy}
          onClick={async () => {
            if (await save.run(() => act("setParking", { carId: car.id, pin, spot }))) router.push("/lend");
          }}
        >
          {save.busy ? "Saving" : "Save parking spot"}
        </button>
      </div>
    </section>
  );
}
