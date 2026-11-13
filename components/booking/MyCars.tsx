"use client";

import Link from "next/link";
import { AIRPORTS } from "@/lib/config";
import { plural, shortDate } from "@/lib/format";
import { useStore } from "@/lib/store";
import { btnQuiet, heading, panel } from "../ui";

export function MyCars() {
  const { state, currentUserId } = useStore();
  const cars = state.cars.filter((c) => c.ownerId === currentUserId);

  return (
    <section aria-labelledby="cars-heading">
      <h2 id="cars-heading" className={heading}>
        Your car on loan
      </h2>
      {cars.length === 0 && <p className="mt-2 text-ink-soft">You have not listed a car.</p>}
      <ul className="mt-3 space-y-3">
        {cars.map((car) => {
          const loans = state.bookings.filter((b) => b.carId === car.id);
          return (
            <li key={car.id} className={`${panel} p-4`}>
              <h3 className="font-display text-2xl font-semibold leading-tight">
                {car.model} at {car.airport}
              </h3>
              <p className="text-ink-soft">
                Parked at {AIRPORTS[car.airport]}. Free to borrow {shortDate(car.from)} until you land on{" "}
                {shortDate(car.to)}.
              </p>
              {loans.length === 0 && <p className="mt-2">Nobody has borrowed it yet.</p>}
              <ul className="mt-2 divide-y divide-line">
                {loans.map((loan) => {
                  const borrower = state.users.find((u) => u.id === loan.userId);
                  const returned = loan.status === "returned";
                  return (
                    <li key={loan.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                      <p>
                        <span className="font-medium">{borrower?.name}</span>, {shortDate(loan.from)} to{" "}
                        {shortDate(loan.to)}.{" "}
                        {returned ? (
                          <strong className="text-clear">You earned {plural(loan.days, "credit")}.</strong>
                        ) : (
                          <>You earn {plural(loan.days, "credit")} when the car comes back.</>
                        )}
                      </p>
                      {returned && (
                        <Link href={`/trip/${loan.id}`} className={`${btnQuiet} w-full sm:w-auto`}>
                          Review return photos
                        </Link>
                      )}
                    </li>
                  );
                })}
              </ul>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
