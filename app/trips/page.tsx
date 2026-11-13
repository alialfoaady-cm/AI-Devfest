"use client";

import { Path } from "@phosphor-icons/react";
import Link from "next/link";
import { CarPhoto, Empty, Pill, btnPrimary, btnQuiet, carGrid, carPhoto, cardTitle, pageTitle } from "@/components/ui";
import { plural, shortDate } from "@/lib/format";
import { tripStage } from "@/lib/inspections";
import { useStore } from "@/lib/store";

const STAGE = {
  pickup: { pill: "Ready to pick up", tone: "green", action: "Find the car" },
  driving: { pill: "On the road", tone: "soft", action: "Return the car" },
  returned: { pill: "Returned", tone: "quiet", action: "See return report" },
} as const;

export default function TripsPage() {
  const { state, currentUserId } = useStore();
  const trips = state.bookings.filter((b) => b.userId === currentUserId).reverse();

  return (
    <section aria-labelledby="trips-heading">
      <h1 id="trips-heading" className={pageTitle}>
        Trips
      </h1>

      {trips.length === 0 ? (
        <div className="mt-6">
          <Empty
            icon={Path}
            title="No trips yet"
            action={
              <Link href="/" className={btnPrimary}>
                Find a car
              </Link>
            }
          >
            Cars you borrow show up here, from pickup to return. Each day costs one credit.
          </Empty>
        </div>
      ) : (
        <ul className={`${carGrid} mt-6`}>
          {trips.map((trip) => {
            const car = state.cars.find((c) => c.id === trip.carId);
            const stage = STAGE[tripStage(state, trip.id)];
            return (
              <li key={trip.id} className="flex flex-col">
                <CarPhoto photo={car?.photo} model={car?.model ?? "Car"} className={carPhoto} />
                <div className="flex flex-1 flex-col items-start px-2 pt-3">
                  <Pill tone={stage.tone}>{stage.pill}</Pill>
                  <h2 className={`${cardTitle} mt-2`}>
                    {car?.model} at {car?.airport}
                  </h2>
                  <p className="text-sm text-ink-soft">
                    {shortDate(trip.from)} to {shortDate(trip.to)}, {plural(trip.days, "credit")}
                  </p>
                  <Link href={`/trips/${trip.id}`} className={`${stage.tone === "quiet" ? btnQuiet : btnPrimary} mt-4 w-full`}>
                    {stage.action}
                  </Link>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
