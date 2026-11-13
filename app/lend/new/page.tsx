"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { CarPhotoPicker } from "@/components/CarPhotoPicker";
import { Select } from "@/components/Select";
import { Notice, Segment, btnPrimary, field, pageTitle, searchBar, segmentControl } from "@/components/ui";
import { AIRPORT_OPTIONS } from "@/lib/config";
import { isoDay } from "@/lib/format";
import { act, useStore, useTask } from "@/lib/store";

export default function ListCarPage() {
  const { currentUserId } = useStore();
  const router = useRouter();
  const [car, setCar] = useState(() => ({ model: "", seats: 5, airport: AIRPORT_OPTIONS[0].value, from: isoDay(1), to: isoDay(8) }));
  const [photo, setPhoto] = useState<string>();
  const { busy, error, run, clearError } = useTask();

  function change(next: Partial<typeof car>) {
    clearError();
    setCar({ ...car, ...next });
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    const next = await run(() => act("listCar", { car: { ...car, photo } }));
    const mine = next?.cars.filter((c) => c.ownerId === currentUserId).at(-1);
    if (mine) router.push(`/lend/${mine.id}/spot`);
  }

  return (
    <section aria-labelledby="list-heading" className="grid gap-8 lg:grid-cols-2 lg:gap-16">
      <div>
        <h1 id="list-heading" className={pageTitle}>
          List your car
        </h1>
        <p className="mt-2 text-ink-soft">Travellers landing at your airport can borrow it while you are away.</p>

        <form className="mt-6 space-y-4" onSubmit={submit}>
          <label className="block font-medium">
            Car
            <input
              className={field}
              required
              maxLength={40}
              placeholder="2019 Honda Civic"
              autoComplete="off"
              value={car.model}
              onChange={(event) => change({ model: event.target.value })}
            />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="font-medium">
              Seats
              <input
                className={field}
                type="number"
                inputMode="numeric"
                min={1}
                max={9}
                required
                value={car.seats}
                onChange={(event) => change({ seats: Number(event.target.value) })}
              />
            </label>
            <Select label="Parked at" align="end" value={car.airport} options={AIRPORT_OPTIONS} onChange={(airport) => change({ airport })} />
          </div>
          <div>
            <div className={searchBar}>
              <Segment label="You fly out">
                <input type="date" required className={segmentControl} value={car.from} onChange={(event) => change({ from: event.target.value })} />
              </Segment>
              <Segment label="You land back">
                <input type="date" required className={segmentControl} value={car.to} min={car.from} onChange={(event) => change({ to: event.target.value })} />
              </Segment>
            </div>
            <p className="mt-2 text-sm text-ink-soft">Nobody can book past the day you land. The car is back before you are.</p>
          </div>
          <Notice>{error}</Notice>
          <button type="submit" className={`${btnPrimary} w-full sm:w-auto`} disabled={busy}>
            {busy ? "Listing your car" : "List car and drop the pin"}
          </button>
        </form>
      </div>

      <div className="max-lg:order-first">
        <CarPhotoPicker photo={photo} model={car.model || "Your car"} onChange={setPhoto} />
        <p className="mt-2 text-sm text-ink-soft">Borrowers pick a car they can see. A photo from the front corner works best.</p>
      </div>
    </section>
  );
}
