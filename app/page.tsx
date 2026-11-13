"use client";

import { CarProfile } from "@phosphor-icons/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Select } from "@/components/Select";
import { CarPhoto, Empty, Notice, Segment, btnPrimary, btnStrong, carGrid, carPhoto, cardTitle, pageTitle, searchBar, segmentControl } from "@/components/ui";
import { AIRPORT_OPTIONS, AIRPORTS } from "@/lib/config";
import { isoDay, plural, shortDate } from "@/lib/format";
import { availableCars, tripDays } from "@/lib/rules";
import { act, useStore, useTask } from "@/lib/store";

export default function FindPage() {
  const { state, currentUserId } = useStore();
  const router = useRouter();
  const [search, setSearch] = useState(() => ({ airport: Object.keys(AIRPORTS)[0], from: isoDay(1), to: isoDay(8) }));
  const { busy, error, run, clearError } = useTask();

  const credits = state.users.find((u) => u.id === currentUserId)?.credits ?? 0;
  const days = tripDays(search.from, search.to);
  const validTrip = days >= 1;
  const cars = availableCars(state, search.airport, search.from, search.to, currentUserId ?? "");
  const canAfford = credits >= days;

  function change(next: Partial<typeof search>) {
    clearError();
    setSearch({ ...search, ...next });
  }

  async function bookCar(carId: string) {
    const next = await run(() => act("book", { carId, from: search.from, to: search.to }));
    const mine = next?.bookings.filter((b) => b.userId === currentUserId && b.carId === carId).at(-1);
    if (mine) router.push(`/trips/${mine.id}`);
  }

  return (
    <section aria-labelledby="find-heading">
      <h1 id="find-heading" className={pageTitle}>
        Find a car where you land
      </h1>

      <form className={`${searchBar} mt-6`} onSubmit={(event) => event.preventDefault()}>
        <Select variant="segment" label="Where" value={search.airport} options={AIRPORT_OPTIONS} onChange={(airport) => change({ airport })} />
        <Segment label="Pick up">
          <input type="date" required className={segmentControl} value={search.from} onChange={(event) => change({ from: event.target.value })} />
        </Segment>
        <Segment label="Return">
          <input type="date" required className={segmentControl} value={search.to} min={search.from} onChange={(event) => change({ to: event.target.value })} />
        </Segment>
      </form>

      <p aria-live="polite" className="mt-4 text-ink-soft">
        {validTrip ? (
          <>
            <span className="font-semibold text-ink">{plural(cars.length, "car")}</span> at {AIRPORTS[search.airport]} for {plural(days, "day")}.
            Each costs {plural(days, "credit")}; you have {credits}.
          </>
        ) : (
          "Pick a return date at least one day after pickup."
        )}
      </p>

      <div className="mt-4 space-y-3">
        <Notice>{error}</Notice>
        {validTrip && !canAfford && cars.length > 0 && (
          <Notice tone="amber">
            This trip needs {plural(days, "credit")} and you have {credits}.{" "}
            <Link href="/lend" className="font-semibold underline underline-offset-4">
              Lend your car to earn more
            </Link>
            , or shorten the trip.
          </Notice>
        )}
      </div>

      <ul className={`${carGrid} mt-4`}>
        {cars.map((car) => {
          const owner = state.users.find((u) => u.id === car.ownerId)?.name.split(" ")[0] ?? "Owner";
          return (
            <li key={car.id} className="flex flex-col">
              <CarPhoto photo={car.photo} model={car.model} className={carPhoto} />
              <div className="flex flex-1 flex-col px-2 pt-2">
                <h2 className={cardTitle}>{car.model}</h2>
                <p className="text-sm text-ink-soft">
                  {plural(car.seats, "seat")}. Lent by {owner}, back by {shortDate(car.to)}.
                </p>
                <div className="mt-auto flex items-center justify-between gap-3 pt-3">
                  <p>
                    <span className="font-bold tabular-nums">{plural(days, "credit")}</span>{" "}
                    <span className="text-sm text-ink-soft">for {plural(days, "day")}</span>
                  </p>
                  <button type="button" className={btnPrimary} disabled={!canAfford || busy} onClick={() => bookCar(car.id)}>
                    Book
                    <span className="sr-only">
                      {" "}
                      the {car.model} for {plural(days, "credit")}
                    </span>
                  </button>
                </div>
              </div>
            </li>
          );
        })}
      </ul>

      {validTrip && cars.length === 0 && (
        <Empty
          icon={CarProfile}
          title={`No cars at ${search.airport} for those dates yet`}
          action={
            <Link href="/lend/new" className={btnStrong}>
              List my car
            </Link>
          }
        >
          Try other dates or the other airport. If you park here when you fly, your car could be the first.
        </Empty>
      )}
    </section>
  );
}
