"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { AIRPORTS } from "@/lib/config";
import { plural, shortDate } from "@/lib/format";
import { availableCars, book, tripDays } from "@/lib/rules";
import { DEFAULT_SEARCH } from "@/lib/sampleData";
import { update, useStore } from "@/lib/store";
import { btnPrimary, field, heading, panel } from "../ui";

export function FindCar() {
  const { state, currentUserId } = useStore();
  const router = useRouter();
  const [search, setSearch] = useState(DEFAULT_SEARCH);
  const [error, setError] = useState("");

  const me = state.users.find((u) => u.id === currentUserId);
  const days = tripDays(search.from, search.to);
  const validTrip = days >= 1;
  const cars = availableCars(state, search.airport, search.from, search.to, currentUserId);
  const canAfford = (me?.credits ?? 0) >= days;

  const change = (key: keyof typeof search) => (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setError("");
    setSearch({ ...search, [key]: event.target.value });
  };

  function bookCar(carId: string) {
    try {
      let bookingId = "";
      update((current) => {
        const next = book(current, currentUserId, carId, search.from, search.to);
        bookingId = next.bookings[next.bookings.length - 1].id;
        return next;
      });
      router.push(`/trip/${bookingId}`);
    } catch (problem) {
      setError(problem instanceof Error ? problem.message : "The booking did not go through.");
    }
  }

  return (
    <section aria-labelledby="find-heading">
      <h1 id="find-heading" className={heading}>
        Find a car where you land
      </h1>

      <form className="mt-4 grid grid-cols-2 gap-3" onSubmit={(event) => event.preventDefault()}>
        <label className="col-span-2 font-medium">
          Airport
          <select className={field} value={search.airport} onChange={change("airport")}>
            {Object.entries(AIRPORTS).map(([code, name]) => (
              <option key={code} value={code}>
                {code}, {name}
              </option>
            ))}
          </select>
        </label>
        <label className="font-medium">
          Pick up
          <input className={field} type="date" value={search.from} onChange={change("from")} />
        </label>
        <label className="font-medium">
          Return
          <input className={field} type="date" value={search.to} min={search.from} onChange={change("to")} />
        </label>
      </form>

      <p className="mt-3 text-ink-soft" aria-live="polite">
        {validTrip
          ? `A ${days}-day trip costs ${plural(days, "credit")}. ${plural(cars.length, "car")} free at ${search.airport}.`
          : "Pick a return date at least one day after pickup."}
      </p>

      {error && (
        <p role="alert" className="mt-3 rounded-md border-2 border-flag bg-flag-tint px-3 py-2 font-medium text-flag">
          {error}
        </p>
      )}

      <ul className="mt-3 space-y-3">
        {cars.map((car) => {
          const owner = state.users.find((u) => u.id === car.ownerId);
          return (
            <li key={car.id} className={`${panel} flex flex-wrap items-center justify-between gap-3 p-4`}>
              <div>
                <h2 className="font-display text-2xl font-semibold leading-tight">{car.model}</h2>
                <p className="text-ink-soft">
                  {car.seats} seats. Lent by {owner?.name}, who lands {shortDate(car.to)}.
                </p>
              </div>
              <div className="w-full sm:w-auto">
                <button
                  type="button"
                  className={`${btnPrimary} w-full`}
                  disabled={!canAfford}
                  onClick={() => bookCar(car.id)}
                >
                  Book for {plural(days, "credit")}
                </button>
                {!canAfford && (
                  <p className="mt-1 text-sm text-flag">
                    You have {plural(me?.credits ?? 0, "credit")}. Lend your car to earn more.
                  </p>
                )}
              </div>
            </li>
          );
        })}
      </ul>

      {validTrip && cars.length === 0 && (
        <p className={`${panel} p-4 text-ink-soft`}>
          No car is free at {search.airport} for all of those dates. Try shorter dates or the other airport.
        </p>
      )}
    </section>
  );
}
