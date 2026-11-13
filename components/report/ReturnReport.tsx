"use client";
/* eslint-disable @next/next/no-img-element -- photos are data URLs or local samples; next/image adds nothing */

// The screen judges look at longest: every pickup photo next to its return photo, with what the
// AI flagged. The AI flags and describes. The owner confirms or disputes. Nothing here moves credits:
// it says who pays for confirmed damage, which depends on whether the borrower bought cover.

import { KM_PER_MILE, MIN_DAMAGE_CONFIDENCE } from "@/lib/config";
import { findingVerdict, kmDriven, slotVerdict, type Verdict } from "@/lib/inspection/verdict";
import { SLOT_LABELS, SLOTS, type Damage, type Inspection, type OwnerDecision, type Slot } from "@/lib/types";
import { card, heading } from "../ui";
import { VERDICT, VERDICT_ORDER, VerdictPill } from "./verdicts";

const percent = (value: number) => `${Math.round(value * 100)}%`;
const miles = (km: number) => `${Math.round(km / KM_PER_MILE).toLocaleString("en-US")} mi`;

function Pair({ before, after, label }: { before: string; after: string; label: string }) {
  const photo = (src: string, caption: string) => (
    <figure className="relative">
      <img src={src} alt={`${label} at ${caption.toLowerCase()}`} className="aspect-[4/3] w-full rounded-xl border border-line bg-surface-2 object-cover" />
      <figcaption className="absolute left-1.5 top-1.5 rounded-full bg-black/65 px-2 py-0.5 text-xs font-bold text-white">{caption}</figcaption>
    </figure>
  );
  return (
    <div className="grid grid-cols-2 gap-2">
      {photo(before, "Pickup")}
      {photo(after, "Return")}
    </div>
  );
}

function Finding({
  damage,
  decision,
  canDecide,
  ownerName,
  payer,
  onDecide,
}: {
  damage: Damage;
  decision: OwnerDecision | undefined;
  canDecide: boolean;
  ownerName: string;
  /** Who pays for confirmed damage, as a sentence for whoever is reading. */
  payer: string;
  onDecide: (decision: OwnerDecision) => void;
}) {
  const flagged = findingVerdict(damage) === "flagged";
  const choice = (value: OwnerDecision, label: string, pressed: string) => (
    <button
      type="button"
      aria-pressed={decision === value}
      onClick={() => onDecide(value)}
      className={`h-12 rounded-xl border px-4 font-semibold transition-[background-color,border-color,scale] duration-150 ease-out active:scale-[0.98] ${
        decision === value ? pressed : "border-line bg-surface text-ink hover:border-ink-soft"
      }`}
    >
      {label}
    </button>
  );

  return (
    <div className="mt-3 rounded-xl bg-surface-2 p-3.5">
      <p className={`text-lg font-bold ${flagged ? "text-red" : "text-amber"}`}>
        <span className="capitalize">{damage.type}</span>, {damage.location}
      </p>
      <p className="text-ink-soft">Severity: {damage.severity}.</p>

      <div className="mt-3 flex items-baseline justify-between">
        <span>AI confidence</span>
        <span className={`text-2xl font-semibold tabular-nums ${flagged ? "text-red" : "text-amber"}`}>{percent(damage.confidence)}</span>
      </div>
      <div
        role="meter"
        aria-label="AI confidence"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(damage.confidence * 100)}
        className="relative mt-1.5 h-2 rounded-full bg-line"
      >
        <div className={`h-full rounded-full ${flagged ? "bg-red" : "bg-amber"}`} style={{ width: percent(damage.confidence) }} />
        {/* The line a finding must cross before the app will call it damage. */}
        <span aria-hidden className="absolute -top-1 h-4 w-0.5 bg-ink" style={{ left: percent(MIN_DAMAGE_CONFIDENCE) }} />
      </div>
      <p className="mt-2 text-sm text-ink-soft">
        {flagged
          ? `Above the ${percent(MIN_DAMAGE_CONFIDENCE)} line, so it is flagged for the owner to check.`
          : `Below the ${percent(MIN_DAMAGE_CONFIDENCE)} line, so it is shown as unsure, not as damage.`}
      </p>

      {canDecide ? (
        <>
          <div className="mt-4 grid grid-cols-2 gap-2">
            {choice("confirmed", "Confirm damage", "border-transparent bg-red text-canvas")}
            {choice("disputed", "Dispute flag", "border-transparent bg-green text-on-green")}
          </div>
          <p className="mt-2 text-sm text-ink-soft" aria-live="polite">
            {decision === "confirmed" && `Recorded. ${payer}`}
            {decision === "disputed" && "Recorded. Nobody pays for a disputed flag."}
            {!decision && "Your call. The AI only flags what it sees."}
          </p>
        </>
      ) : (
        <p className="mt-4 font-medium">
          {decision === "confirmed" && `${ownerName} confirmed this as damage. ${payer}`}
          {decision === "disputed" && `${ownerName} disputed this flag.`}
          {!decision && `Waiting for ${ownerName} to confirm or dispute.`}
        </p>
      )}
    </div>
  );
}

export function ReturnReport({
  pickup,
  ret,
  ownerName,
  borrowerName,
  insured,
  canDecide,
  onDecide,
}: {
  pickup: Inspection;
  ret: Inspection;
  ownerName: string;
  borrowerName: string;
  /** The borrower bought cover for this trip. */
  insured: boolean;
  canDecide: boolean;
  onDecide: (findingKey: string, decision: OwnerDecision) => void;
}) {
  const results = ret.aiResult;
  if (!results) return null;

  const verdictOf = (slot: Slot) => slotVerdict(results[slot]);
  const count = (verdict: Verdict) => SLOTS.filter((slot) => verdictOf(slot) === verdict).length;
  const toReview = SLOTS.filter((slot) => verdictOf(slot) !== "clear").sort(
    (a, b) => VERDICT_ORDER.indexOf(verdictOf(a)) - VERDICT_ORDER.indexOf(verdictOf(b)),
  );
  const unchanged = SLOTS.filter((slot) => verdictOf(slot) === "clear");
  // The report is shown to the owner (who can decide) and to the borrower.
  const payer = insured
    ? "This trip is insured, so Sayara pays for the repair."
    : `This trip is not insured, so ${canDecide ? borrowerName : "you"} ${canDecide ? "pays" : "pay"} for the repair.`;
  const dash = results.dashboard;
  const driven = kmDriven(dash);

  return (
    <section aria-labelledby="report-heading" className="space-y-4">
      <div>
        <h2 id="report-heading" className={heading}>
          Return report
        </h2>
        <p className="mt-1 text-ink-soft">
          {ret.aiProvider === "watsonx"
            ? "Each pair was compared by IBM watsonx."
            : "Mock mode: these are sample answers, not a real AI reading of the photos."}{" "}
          The AI flags, and {canDecide ? "you decide" : `${ownerName} decides`}.
        </p>
      </div>

      {/* One tile per number, as on the phone. A count is coloured only when it is not zero. */}
      <dl className="grid grid-cols-3 gap-2 lg:grid-cols-6">
        {[
          ["Driven", driven != null ? miles(driven) : "Not read", ""],
          ["Odometer", dash?.odometer_km != null ? miles(dash.odometer_km) : "Not read", ""],
          ["Fuel", dash?.fuel_level ?? "Not read", ""],
          ...VERDICT_ORDER.map((verdict) => [VERDICT[verdict].short, String(count(verdict)), count(verdict) > 0 ? VERDICT[verdict].text : ""]),
        ].map(([term, value, colour]) => (
          <div key={term} className="flex flex-col-reverse items-center rounded-xl bg-surface px-2 py-2.5 text-center">
            <dt className="text-sm text-ink-soft">{term}</dt>
            <dd className={`text-xl font-bold leading-tight tabular-nums ${colour}`}>{value}</dd>
          </div>
        ))}
      </dl>

      <ul className="grid items-start gap-3 lg:grid-cols-2">
        {toReview.map((slot) => {
          const result = results[slot];
          const verdict = verdictOf(slot);
          return (
            <li key={slot} className={`${card} p-4 ${VERDICT[verdict].border}`}>
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-lg font-bold">{SLOT_LABELS[slot]}</h3>
                <VerdictPill verdict={verdict} />
              </div>
              <Pair before={pickup.photos[slot]} after={ret.photos[slot]} label={SLOT_LABELS[slot]} />
              {!result && (
                <p className="mt-3 font-medium">
                  The AI did not give an answer we could trust for this pair. Compare the two photos yourself.
                </p>
              )}
              {result?.new_damage.map((damage, index) => {
                const key = `${slot}:${index}`;
                return (
                  <Finding
                    key={key}
                    damage={damage}
                    decision={ret.ownerDecision[key]}
                    canDecide={canDecide}
                    ownerName={ownerName}
                    payer={payer}
                    onDecide={(decision) => onDecide(key, decision)}
                  />
                );
              })}
              {result?.notes && <p className="mt-3 text-ink-soft">AI note: {result.notes}</p>}
            </li>
          );
        })}
      </ul>

      {unchanged.length > 0 && (
        <div>
          <h3 className="mb-2 font-semibold">No change found</h3>
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {unchanged.map((slot) => (
              <li key={slot} className={`${card} p-3`}>
                <p className="mb-2 font-medium">{SLOT_LABELS[slot]}</p>
                <Pair before={pickup.photos[slot]} after={ret.photos[slot]} label={SLOT_LABELS[slot]} />
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
