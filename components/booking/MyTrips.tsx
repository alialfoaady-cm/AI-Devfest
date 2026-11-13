"use client";

import Link from "next/link";
import { plural, shortDate } from "@/lib/format";
import { tripStage } from "@/lib/inspections";
import { useStore } from "@/lib/store";
import { btnPrimary, btnQuiet, heading, panel } from "../ui";

const NEXT_STEP = {
  pickup: "Take pickup photos",
  driving: "Return the car",
  returned: "See return report",
};

export function MyTrips() {
  const { state, currentUserId } = useStore();
  const trips = state.bookings.filter((b) => b.userId === currentUserId);

  return (
    <section aria-labelledby="trips-heading">
      <h2 id="trips-heading" className={heading}>
        Your trips
      </h2>
      {trips.length === 0 && <p className="mt-2 text-ink-soft">No trips yet. Book a car above to start one.</p>}
      <ul className="mt-3 space-y-3">
        {trips.map((trip) => {
          const car = state.cars.find((c) => c.id === trip.carId);
          const stage = tripStage(state, trip.id);
          return (
            <li key={trip.id} className={`${panel} flex flex-wrap items-center justify-between gap-3 p-4`}>
              <div>
                <h3 className="font-display text-2xl font-semibold leading-tight">
                  {car?.model} at {car?.airport}
                </h3>
                <p className="text-ink-soft">
                  {shortDate(trip.from)} to {shortDate(trip.to)}, {plural(trip.days, "credit")}
                  {stage === "returned" ? ". Returned." : ""}
                </p>
              </div>
              <Link href={`/trip/${trip.id}`} className={`${stage === "returned" ? btnQuiet : btnPrimary} w-full sm:w-auto`}>
                {NEXT_STEP[stage]}
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
