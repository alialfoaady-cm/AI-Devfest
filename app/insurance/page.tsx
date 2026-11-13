"use client";

import { ShieldCheck, ShieldSlash } from "@phosphor-icons/react";
import Link from "next/link";
import { useState } from "react";
import { PayChoice, creditsToUse } from "@/components/PayChoice";
import { Empty, Notice, Pill, btnPrimary, card, cardTitle, heading, pageTitle } from "@/components/ui";
import { INSURANCE_CREDITS_PER_DAY, USD_PER_CREDIT } from "@/lib/config";
import { payText, plural, shortDate, usd } from "@/lib/format";
import { tripStage } from "@/lib/inspections";
import { insuranceCost } from "@/lib/rules";
import { act, useStore, useTask } from "@/lib/store";
import type { Booking } from "@/lib/types";

const SIDES = [
  { Icon: ShieldCheck, tone: "bg-green-soft text-green-ink", name: "With cover", detail: "If the owner confirms damage after your trip, Sayara pays for the repair." },
  { Icon: ShieldSlash, tone: "bg-red-soft text-red", name: "Without cover", detail: "If the owner confirms damage after your trip, you pay for the repair yourself." },
];

/** Cover is bought per trip, before pickup. It decides who pays for damage the owner confirms. */
export default function InsurancePage() {
  const { state, currentUserId } = useStore();
  const balance = state.users.find((u) => u.id === currentUserId)?.credits ?? 0;
  const trips = state.bookings.filter((b) => b.userId === currentUserId).reverse();

  return (
    <section aria-labelledby="insurance-heading">
      <h1 id="insurance-heading" className={pageTitle}>
        Insurance
      </h1>
      <p className="mt-2 max-w-2xl text-ink-soft">
        Cover a trip and Sayara pays for damage. It costs {INSURANCE_CREDITS_PER_DAY} credits a day ({usd(INSURANCE_CREDITS_PER_DAY * USD_PER_CREDIT)}), and you buy it before
        you pick up the car.
      </p>

      <ul className="mt-6 grid gap-4 sm:grid-cols-2">
        {SIDES.map(({ Icon, tone, name, detail }) => (
          <li key={name} className={`${card} flex items-start gap-4 p-4`}>
            <span className={`grid size-13 shrink-0 place-items-center rounded-xl ${tone}`}>
              <Icon size={26} weight="fill" aria-hidden />
            </span>
            <div>
              <h2 className="text-lg font-bold leading-tight tracking-tight">{name}</h2>
              <p className="mt-0.5 text-ink-soft">{detail}</p>
            </div>
          </li>
        ))}
      </ul>

      <h2 className={`${heading} mt-10`}>Your trips</h2>
      {trips.length === 0 ? (
        <div className="mt-4">
          <Empty
            icon={ShieldCheck}
            title="No trips to cover yet"
            action={
              <Link href="/" className={btnPrimary}>
                Find a car
              </Link>
            }
          >
            Book a car first. You can add cover any time before you pick it up.
          </Empty>
        </div>
      ) : (
        <ul className="mt-4 grid items-start gap-4 lg:grid-cols-2">
          {trips.map((trip) => (
            <CoverRow key={trip.id} trip={trip} balance={balance} />
          ))}
        </ul>
      )}
    </section>
  );
}

function CoverRow({ trip, balance }: { trip: Booking; balance: number }) {
  const { state } = useStore();
  const [useCredits, setUseCredits] = useState(true);
  const { busy, error, run } = useTask();
  const car = state.cars.find((c) => c.id === trip.carId);
  const cost = insuranceCost(trip.days);
  const credits = creditsToUse(cost, balance, useCredits);
  const beforePickup = tripStage(state, trip.id) === "pickup";
  const cancelled = trip.status === "cancelled";

  return (
    <li className={`${card} p-4`}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 className={cardTitle}>
            {car?.model} at {car?.airport}
          </h3>
          <p className="text-ink-soft">
            {shortDate(trip.from)} to {shortDate(trip.to)}, {plural(trip.days, "day")}
          </p>
        </div>
        <Pill tone={trip.insurance && !cancelled ? "green" : "quiet"}>{cancelled ? "Cancelled" : trip.insurance ? "Covered" : "Not covered"}</Pill>
      </div>

      {cancelled ? (
        <p className="mt-3 text-ink-soft">This trip was cancelled, so there is nothing to cover.</p>
      ) : trip.insurance ? (
        <p className="mt-3">Sayara pays for damage on this trip. You paid {payText(trip.insurance)}.</p>
      ) : beforePickup ? (
        <div className="mt-4 space-y-3">
          <p>
            Cover for this trip costs <span className="font-semibold">{plural(cost, "credit")}</span> or {usd(cost * USD_PER_CREDIT)}.
          </p>
          <PayChoice cost={cost} balance={balance} useCredits={useCredits} onChange={setUseCredits} />
          <Notice>{error}</Notice>
          <button
            type="button"
            className={`${btnPrimary} w-full`}
            disabled={busy}
            onClick={() => run(() => act("insure", { bookingId: trip.id, creditsUsed: credits }))}
          >
            Buy cover for {payText({ credits, usd: (cost - credits) * USD_PER_CREDIT })}
          </button>
        </div>
      ) : (
        <p className="mt-3 text-ink-soft">Cover has to be bought before pickup. On this trip you pay for any damage the owner confirms.</p>
      )}
    </li>
  );
}
