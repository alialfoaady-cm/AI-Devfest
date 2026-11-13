"use client";

import { Key, MapPin, Plus } from "@phosphor-icons/react";
import Link from "next/link";
import { ParkingMap } from "@/components/ParkingMap";
import { CarPhoto, Empty, Initial, Notice, Pill, btnPrimary, btnQuiet, btnStrong, card, pageTitle } from "@/components/ui";
import { AIRPORTS } from "@/lib/config";
import { shortDate } from "@/lib/format";
import { tripStage } from "@/lib/inspections";
import { useStore } from "@/lib/store";

export default function LendPage() {
  const { state, currentUserId } = useStore();
  const cars = state.cars.filter((c) => c.ownerId === currentUserId);

  return (
    <section aria-labelledby="lend-heading">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 id="lend-heading" className={pageTitle}>
            Lend my car
          </h1>
          <p className="mt-2 text-ink-soft">One credit for every day someone borrows it, paid when it comes back.</p>
        </div>
        {cars.length > 0 && (
          <Link href="/lend/new" className={btnStrong}>
            <Plus size={20} weight="bold" aria-hidden />
            List a car
          </Link>
        )}
      </div>

      {cars.length === 0 && (
        <div className="mt-6">
          <Empty
            icon={Key}
            title="Your car could be earning while you fly"
            action={
              <Link href="/lend/new" className={btnPrimary}>
                List my car
              </Link>
            }
          >
            List it for the days you are away. Travellers landing at your airport borrow it, and it is back before you are.
          </Empty>
        </div>
      )}

      <ul className="mt-6 grid items-start gap-5 lg:grid-cols-2">
        {cars.map((car) => {
          const loans = state.bookings.filter((b) => b.carId === car.id);
          return (
            <li key={car.id} className={`${card} overflow-hidden`}>
              <div className="grid grid-cols-2">
                <CarPhoto photo={car.photo} model={car.model} className="aspect-[4/3] w-full" />
                {car.pin ? (
                  <ParkingMap center={car.pin} label={car.spot} className="rounded-none border-0" />
                ) : (
                  <div className="flex flex-col items-center justify-center gap-2 bg-surface-2 p-3 text-center text-ink-soft">
                    <MapPin size={28} weight="light" aria-hidden />
                    <span className="text-sm">No pin yet</span>
                  </div>
                )}
              </div>
              <div className="p-4">
                <h2 className="text-lg font-bold leading-tight tracking-tight">{car.model}</h2>
                <p className="mt-1 text-ink-soft">
                  {AIRPORTS[car.airport]}. Free from {shortDate(car.from)} until you land on {shortDate(car.to)}.
                </p>
                {!car.pin && (
                  <div className="mt-3">
                    <Notice tone="amber">Borrowers cannot find this car until you drop its pin.</Notice>
                  </div>
                )}
                <Link href={`/lend/${car.id}/spot`} className={`${car.pin ? btnQuiet : btnPrimary} mt-4 w-full`}>
                  <MapPin size={20} weight="fill" aria-hidden />
                  {car.pin ? "Move the pin" : "Drop the pin"}
                </Link>

                <h3 className="mt-6 text-sm font-semibold">Borrowers</h3>
                {loans.length === 0 && <p className="mt-1 text-ink-soft">Nobody has borrowed it yet.</p>}
                <ul className="divide-y divide-line">
                  {loans.map((loan) => {
                    const borrower = state.users.find((u) => u.id === loan.userId)?.name.split(" ")[0] ?? "Someone";
                    const returned = tripStage(state, loan.id) === "returned";
                    return (
                      <li key={loan.id} className="py-3">
                        <div className="flex items-center gap-2.5">
                          <Initial name={borrower} />
                          <p className="min-w-0 flex-1">
                            <span className="font-medium">{borrower}</span>
                            <span className="text-ink-soft">
                              , {shortDate(loan.from)} to {shortDate(loan.to)}
                            </span>
                          </p>
                          <Pill tone={returned ? "soft" : "quiet"}>{returned ? `Earned ${loan.days}` : `Earns ${loan.days}`}</Pill>
                        </div>
                        {returned && (
                          <Link href={`/trips/${loan.id}`} className={`${btnQuiet} mt-3 w-full`}>
                            Review return photos
                          </Link>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
