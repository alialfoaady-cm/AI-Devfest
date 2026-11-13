"use client";

import { ArrowSquareOut, MapPin } from "@phosphor-icons/react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ParkingMap, mapsLink } from "@/components/ParkingMap";
import { ReturnReport } from "@/components/report/ReturnReport";
import { CancelTrip } from "@/components/trip/CancelTrip";
import { KeyCode, PickupPhotos, ReturnCheck, Savings } from "@/components/trip/steps";
import { CarPhoto, Pill, btnQuiet, card, cardLabel, heading, pageTitle } from "@/components/ui";
import { MILES_INCLUDED_PER_DAY } from "@/lib/config";
import { payText, plural, shortDate } from "@/lib/format";
import { findInspection, tripStage } from "@/lib/inspections";
import { refundOf, tripCost } from "@/lib/rules";
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
  const live = stage === "pickup" || stage === "driving";
  const balance = state.users.find((u) => u.id === currentUserId)?.credits ?? 0;
  const pickup = findInspection(state, booking.id, "pickup");
  const ret = findInspection(state, booking.id, "return");

  return (
    <div className="space-y-8">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-5">
        <CarPhoto photo={car.photo} model={car.model} className="aspect-[4/3] w-32 shrink-0 rounded-xl sm:w-36" />
        <div className="min-w-0 flex-1">
          <h1 className={pageTitle}>
            {car.model} at {car.airport}
          </h1>
          <p className="mt-1 text-ink-soft">
            {shortDate(booking.from)} to {shortDate(booking.to)}. {isOwner ? `Borrowed by ${borrower}.` : `Lent by ${owner}.`}{" "}
            {booking.days * MILES_INCLUDED_PER_DAY} miles included.
          </p>
          <p className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1">
            <Pill tone={booking.insurance ? "green" : "quiet"}>{booking.insurance ? "Insured: Sayara pays for damage" : "Not insured"}</Pill>
            {!booking.insurance && isBorrower && stage === "pickup" && (
              <Link href="/insurance" className="font-semibold underline underline-offset-4">
                Add cover before pickup
              </Link>
            )}
          </p>
          <ol className="mt-4 grid max-w-sm grid-cols-3 gap-1.5" aria-label="Trip progress">
            {STEPS.map(({ label }, index) => (
              <li key={label} aria-current={index === step ? "step" : undefined}>
                <span className={`block h-1 rounded-full transition-colors duration-300 ${index <= step ? "bg-green" : "bg-line"}`} />
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
      {isBorrower && live && (
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

      {isOwner && live && (
        <p className={`${card} max-w-xl p-4`}>
          {stage === "pickup"
            ? `${borrower} has booked your car and has not picked it up yet.`
            : `${borrower} has your car. The pickup photos are saved.`}{" "}
          You earn {plural(tripCost(booking.days), "credit")} when it comes back, plus 1 for each extra mile.
        </p>
      )}

      {stage === "returned" && (isBorrower || isOwner) && (
        <div className="enter space-y-8">
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,26rem)] lg:items-center">
            <div role="status">
              <p className="text-2xl font-bold leading-tight tracking-tight sm:text-3xl">
                Car returned.{" "}
                <span className="text-green-ink">
                  {isOwner ? "You" : owner} earned {plural(tripCost(booking.days) + (booking.mileage?.credits ?? 0), "credit")}.
                </span>
              </p>
              <p className="mt-2 text-ink-soft">
                {!booking.mileage
                  ? "The odometer could not be read from the dashboard photos, so there is no charge for miles."
                  : booking.mileage.extraMiles === 0
                    ? `${booking.mileage.miles} miles driven, inside the ${booking.mileage.included} included.`
                    : `${booking.mileage.miles} miles driven, ${booking.mileage.included} included. The ${booking.mileage.extraMiles} extra ${
                        booking.mileage.credits === 0
                          ? "were too few to cost a credit."
                          : `cost ${isBorrower ? "you" : borrower} ${plural(booking.mileage.credits, "credit")}, paid to ${isOwner ? "you" : owner}.`
                      }`}
              </p>
            </div>
            <Savings days={booking.days} />
          </div>
          {pickup && ret && (
            <ReturnReport
              pickup={pickup}
              ret={ret}
              ownerName={owner}
              borrowerName={borrower}
              insured={Boolean(booking.insurance)}
              canDecide={isOwner}
              onDecide={(findingKey, decision) => act("decideFinding", { inspectionId: ret.id, findingKey, decision }).catch(() => {})}
            />
          )}
        </div>
      )}

      {/* Either person can cancel until the car is picked up. What it costs shows only in that window. */}
      {(isBorrower || isOwner) && stage === "pickup" && (
        <CancelTrip
          bookingId={booking.id}
          days={booking.days}
          balance={balance}
          refund={isBorrower ? refundOf(booking) : { credits: 0, usd: 0 }}
          otherName={isBorrower ? owner : borrower}
        />
      )}

      {booking.cancelled && (isBorrower || isOwner) && (
        <div className={`${card} max-w-xl p-4`} role="status">
          <p className="text-xl font-bold tracking-tight">
            {booking.cancelled.by === currentUserId ? "You" : name(booking.cancelled.by)} cancelled this trip.
          </p>
          <p className="mt-2 text-ink-soft">
            {booking.cancelled.by === currentUserId ? "You" : name(booking.cancelled.by)} paid {payText(booking.cancelled.fee)} to cancel.{" "}
            {plural(booking.cancelled.parkingCredits, "credit")} of it went to {booking.cancelled.by === booking.userId ? (isOwner ? "you" : owner) : isBorrower ? "you" : borrower}{" "}
            for parking, and the rest to Sayara. {isBorrower ? "You" : borrower} got back the {payText(booking.cancelled.refund)} paid for the trip.
          </p>
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
    <section aria-labelledby="where-heading" className={`${card} p-4 sm:p-5`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 id="where-heading" className={`${cardLabel} text-green-ink`}>
            <MapPin size={20} weight="fill" aria-hidden />
            {returning ? "Bring it back to the same spot" : "Find the car"}
          </h2>
          <p className="mt-1 text-ink-soft">{car.pin ? `Pinned by ${owner}.` : `${owner} has not pinned the parking spot yet.`}</p>
        </div>
        {car.spot && (
          <p className="shrink-0 rounded-xl bg-surface-2 px-3.5 py-2 text-right">
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
