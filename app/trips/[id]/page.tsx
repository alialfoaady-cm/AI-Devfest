"use client";

import { ArrowSquareOut } from "@phosphor-icons/react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ParkingMap, mapsLink } from "@/components/ParkingMap";
import { ReturnReport } from "@/components/report/ReturnReport";
import { KeyCode, PickupPhotos, ReturnCheck, Savings } from "@/components/trip/steps";
import { CarPhoto, btnQuiet, card, heading, pageTitle } from "@/components/ui";
import { plural, shortDate } from "@/lib/format";
import { findInspection, tripStage } from "@/lib/inspections";
import { act, useStore } from "@/lib/store";
import type { Car } from "@/lib/types";

const STEPS = [
  { stage: "pickup", label: "Pick up" },
  { stage: "driving", label: "Drive" },
  { stage: "returned", label: "Return" },
] as const;

export default function TripPage() {
  const { id } = useParams<{ id: string }>();
  const { state, currentUserId } = useStore();

  const booking = state.bookings.find((b) => b.id === id);
  const car = state.cars.find((c) => c.id === booking?.carId);
  if (!booking || !car) {
    return (
      <div className={`${card} max-w-md p-5`}>
        <h1 className={heading}>This trip is not here</h1>
        <p className="my-3 text-ink-soft">The sample data may have been reset since it was booked.</p>
        <Link href="/" className={`${btnQuiet} w-full`}>
          Find a car
        </Link>
      </div>
    );
  }

  const name = (userId: string) => state.users.find((u) => u.id === userId)?.name.split(" ")[0] ?? "Someone";
  const owner = name(car.ownerId);
  const borrower = name(booking.userId);
  const isBorrower = booking.userId === currentUserId;
  const isOwner = car.ownerId === currentUserId;
  const stage = tripStage(state, booking.id);
  const step = STEPS.findIndex((s) => s.stage === stage);
  const pickup = findInspection(state, booking.id, "pickup");
  const ret = findInspection(state, booking.id, "return");

  return (
    <div className="space-y-8">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-5">
        <CarPhoto photo={car.photo} model={car.model} className="aspect-[4/3] w-32 shrink-0 rounded-lg sm:w-36" />
        <div className="min-w-0 flex-1">
          <h1 className={pageTitle}>
            {car.model} at {car.airport}
          </h1>
          <p className="mt-1 text-ink-soft">
            {shortDate(booking.from)} to {shortDate(booking.to)}. {isOwner ? `Borrowed by ${borrower}.` : `Lent by ${owner}.`}
          </p>
          <ol className="mt-4 grid max-w-sm grid-cols-3 gap-1.5" aria-label="Trip progress">
            {STEPS.map(({ label }, index) => (
              <li key={label} aria-current={index === step ? "step" : undefined}>
                <span className={`block h-1 rounded-full transition-colors duration-300 ${index <= step ? "bg-ink" : "bg-line"}`} />
                <span className={`mt-1 block text-sm font-medium ${index === step ? "text-ink" : "text-ink-soft"}`}>
                  {label}
                  <span className="sr-only">{index < step ? ", done" : index === step ? ", now" : ", later"}</span>
                </span>
              </li>
            ))}
          </ol>
        </div>
      </header>

      {/* On phones the blocks stack in the order you need them; from lg the map sits beside the steps. */}
      {isBorrower && stage !== "returned" && (
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,26rem)] lg:items-start lg:gap-x-12">
          {stage === "driving" && <KeyCode bookingId={booking.id} />}
          <div className="lg:sticky lg:top-20 lg:col-start-2 lg:row-span-2 lg:row-start-1">
            <WhereItIs car={car} owner={owner} returning={stage === "driving"} />
          </div>
          <div className="lg:col-start-1">
            {stage === "pickup" && <PickupPhotos bookingId={booking.id} />}
            {stage === "driving" && pickup && <ReturnCheck bookingId={booking.id} pickupPhotos={pickup.photos} />}
          </div>
        </div>
      )}

      {isOwner && stage !== "returned" && (
        <p className={`${card} max-w-xl p-4`}>
          {stage === "pickup"
            ? `${borrower} has booked your car and has not picked it up yet.`
            : `${borrower} has your car. The pickup photos are saved.`}{" "}
          You earn {plural(booking.days, "credit")} when it comes back.
        </p>
      )}

      {stage === "returned" && (isBorrower || isOwner) && (
        <div className="enter space-y-8">
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,26rem)] lg:items-center">
            <p className="text-2xl font-bold leading-tight tracking-tight sm:text-3xl" role="status">
              Car returned.{" "}
              <span className="text-green-ink">
                {isOwner ? `You earned ${plural(booking.days, "credit")}.` : `${owner} earned ${plural(booking.days, "credit")}.`}
              </span>
            </p>
            <Savings days={booking.days} />
          </div>
          {pickup && ret && (
            <ReturnReport
              pickup={pickup}
              ret={ret}
              ownerName={owner}
              canDecide={isOwner}
              onDecide={(findingKey, decision) => act("decideFinding", { inspectionId: ret.id, findingKey, decision }).catch(() => {})}
            />
          )}
        </div>
      )}

      {!isBorrower && !isOwner && (
        <p className={`${card} max-w-xl p-4`}>This trip belongs to other users. Switch user at the top to see it.</p>
      )}
    </div>
  );
}

function WhereItIs({ car, owner, returning }: { car: Car; owner: string; returning: boolean }) {
  return (
    <section aria-labelledby="where-heading">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 id="where-heading" className={heading}>
            {returning ? "Bring it back to the same spot" : "Find the car"}
          </h2>
          <p className="mt-1 text-ink-soft">{car.pin ? `Pinned by ${owner}.` : `${owner} has not pinned the parking spot yet.`}</p>
        </div>
        {car.spot && (
          <p className="shrink-0 rounded-lg bg-surface px-3.5 py-2 text-right">
            <span className="block text-sm text-ink-soft">Spot</span>
            <span className="text-2xl font-bold leading-none tabular-nums">{car.spot}</span>
          </p>
        )}
      </div>
      {car.pin && (
        <>
          <ParkingMap center={car.pin} label={car.spot} className="mt-4 h-60 lg:h-80" />
          <a href={mapsLink(car.pin)} target="_blank" rel="noreferrer" className={`${btnQuiet} mt-3 w-full`}>
            Open in Google Maps
            <ArrowSquareOut size={20} aria-hidden />
          </a>
        </>
      )}
    </section>
  );
}
