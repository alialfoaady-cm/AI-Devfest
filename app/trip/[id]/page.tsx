"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { CompareReport } from "@/components/compare/CompareReport";
import { Impact } from "@/components/trip/Impact";
import { LockerCode } from "@/components/trip/LockerCode";
import { PickupStep } from "@/components/trip/PickupStep";
import { ReturnStep } from "@/components/trip/ReturnStep";
import { btnQuiet, heading, panel } from "@/components/ui";
import { plural, shortDate } from "@/lib/format";
import { decideFinding, findInspection, tripStage } from "@/lib/inspections";
import { update, useStore } from "@/lib/store";

export default function TripPage() {
  const { id } = useParams<{ id: string }>();
  const { state, currentUserId } = useStore();

  const booking = state.bookings.find((b) => b.id === id);
  const car = state.cars.find((c) => c.id === booking?.carId);
  if (!booking || !car) {
    return (
      <div className={`${panel} p-4`}>
        <h1 className={heading}>This trip is not here</h1>
        <p className="my-2 text-ink-soft">The sample data may have been reset since it was booked.</p>
        <Link href="/" className={btnQuiet}>
          Back to search
        </Link>
      </div>
    );
  }

  const name = (userId: string) => state.users.find((u) => u.id === userId)?.name ?? "Someone";
  const isBorrower = booking.userId === currentUserId;
  const isOwner = car.ownerId === currentUserId;
  const stage = tripStage(state, booking.id);
  const pickup = findInspection(state, booking.id, "pickup");
  const ret = findInspection(state, booking.id, "return");

  return (
    <div className="space-y-6">
      <div>
        <Link href="/" className="inline-flex min-h-11 items-center underline underline-offset-4">
          All trips
        </Link>
        <h1 className={heading}>
          {car.model} at {car.airport}
        </h1>
        <p className="text-ink-soft">
          {shortDate(booking.from)} to {shortDate(booking.to)}.{" "}
          {isOwner ? `Borrowed by ${name(booking.userId)}.` : `Lent by ${name(car.ownerId)}.`}
        </p>
      </div>

      {isBorrower && stage === "pickup" && <PickupStep bookingId={booking.id} />}

      {isBorrower && stage === "driving" && pickup && (
        <>
          <LockerCode bookingId={booking.id} />
          <ReturnStep bookingId={booking.id} pickupPhotos={pickup.photos} />
        </>
      )}

      {isOwner && stage !== "returned" && (
        <p className={`${panel} p-4`}>
          {stage === "pickup"
            ? `${name(booking.userId)} has booked your car and has not picked it up yet.`
            : `${name(booking.userId)} has your car. The pickup photos are saved.`}{" "}
          You earn {plural(booking.days, "credit")} when it comes back.
        </p>
      )}

      {stage === "returned" && (isBorrower || isOwner) && (
        <>
          <p className="rounded-lg border-2 border-clear bg-clear-tint p-4 text-xl font-semibold text-clear" role="status">
            Car returned.{" "}
            {isOwner
              ? `You earned ${plural(booking.days, "credit")}.`
              : `${name(car.ownerId)} earned ${plural(booking.days, "credit")}.`}
          </p>
          <Impact days={booking.days} />
          {pickup && ret && (
            <CompareReport
              pickup={pickup}
              ret={ret}
              ownerName={name(car.ownerId)}
              canDecide={isOwner}
              onDecide={(key, decision) => update((s) => decideFinding(s, ret.id, key, decision))}
            />
          )}
        </>
      )}

      {!isBorrower && !isOwner && (
        <p className={`${panel} p-4`}>This trip belongs to other users. Switch user at the top to see it.</p>
      )}
    </div>
  );
}
