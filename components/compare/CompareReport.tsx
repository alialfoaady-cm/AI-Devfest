"use client";
/* eslint-disable @next/next/no-img-element -- photos are data URLs or local samples; next/image adds nothing */

// The screen judges look at longest: every pickup photo next to its return photo, with what the
// AI flagged. The AI flags and describes. The owner confirms or disputes. Nothing here moves credits.

import { MIN_DAMAGE_CONFIDENCE } from "@/lib/config";
import { findingVerdict, kmDriven, slotVerdict, type Verdict } from "@/lib/inspection/verdict";
import { SLOT_LABELS, SLOTS, type Damage, type Inspection, type OwnerDecision, type Slot } from "@/lib/types";
import { heading, panel } from "../ui";

const LOOK: Record<Verdict, { label: string; bar: string; chip: string; path: string }> = {
  flagged: {
    label: "New damage flagged",
    bar: "bg-flag",
    chip: "bg-flag text-white",
    path: "M12 3 2 21h20L12 3Zm-1 7h2v5h-2v-5Zm0 7h2v2h-2v-2Z",
  },
  unsure: {
    label: "Unsure",
    bar: "bg-lane-deep",
    chip: "bg-unsure-tint text-unsure",
    path: "M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Zm-1 15h2v2h-2v-2Zm1-12a4 4 0 0 1 2.6 7c-.9.8-1.6 1.3-1.6 2.5h-2c0-2 1-3 2-3.8A2 2 0 1 0 10 9H8a4 4 0 0 1 4-4Z",
  },
  clear: {
    label: "No change found",
    bar: "bg-clear",
    chip: "bg-clear-tint text-clear",
    path: "M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Zm-1.5 14.5-4-4 1.4-1.4 2.6 2.6 5.6-5.6 1.4 1.4-7 7Z",
  },
};
const ORDER: Verdict[] = ["flagged", "unsure", "clear"];
const percent = (value: number) => `${Math.round(value * 100)}%`;
const km = (value: number) => `${value.toLocaleString("en-US")} km`;

function VerdictChip({ verdict, count }: { verdict: Verdict; count?: number }) {
  const look = LOOK[verdict];
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 font-semibold ${look.chip}`}>
      <svg viewBox="0 0 24 24" className="h-5 w-5 shrink-0 fill-current" aria-hidden>
        <path d={look.path} fillRule="evenodd" />
      </svg>
      {count !== undefined && <span className="tabular-nums">{count}</span>}
      {look.label}
    </span>
  );
}

function Photo({ src, caption, alt }: { src: string; caption: string; alt: string }) {
  return (
    <figure className="relative overflow-hidden rounded-md bg-concrete">
      <img src={src} alt={alt} className="aspect-[4/3] w-full object-cover" />
      <figcaption className="absolute left-0 top-0 rounded-br-md bg-ink px-2 py-0.5 text-sm font-medium text-white">
        {caption}
      </figcaption>
    </figure>
  );
}

function Confidence({ value }: { value: number }) {
  const flagged = value >= MIN_DAMAGE_CONFIDENCE;
  return (
    <div className="mt-2">
      <p className="flex justify-between">
        <span>AI confidence</span>
        <span className="font-display text-2xl font-semibold leading-none tabular-nums">{percent(value)}</span>
      </p>
      <div
        role="meter"
        aria-label="AI confidence"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(value * 100)}
        className="relative mt-1 h-3 rounded-full bg-line"
      >
        <div className={`h-full rounded-full ${flagged ? "bg-flag" : "bg-lane-deep"}`} style={{ width: percent(value) }} />
        {/* The line a finding must cross before the app will call it damage. */}
        <span
          aria-hidden
          className="absolute -top-1 h-5 w-0.5 bg-ink"
          style={{ left: percent(MIN_DAMAGE_CONFIDENCE) }}
        />
      </div>
      <p className="mt-1 text-sm text-ink-soft">
        {flagged
          ? `Above the ${percent(MIN_DAMAGE_CONFIDENCE)} line, so it is flagged for the owner to check.`
          : `Below the ${percent(MIN_DAMAGE_CONFIDENCE)} line, so it is shown as unsure, not as damage.`}
      </p>
    </div>
  );
}

function Finding({
  damage,
  decision,
  canDecide,
  ownerName,
  onDecide,
}: {
  damage: Damage;
  decision: OwnerDecision | undefined;
  canDecide: boolean;
  ownerName: string;
  onDecide: (decision: OwnerDecision) => void;
}) {
  const choice = (value: OwnerDecision, label: string, pressed: string) => (
    <button
      type="button"
      aria-pressed={decision === value}
      onClick={() => onDecide(value)}
      className={`min-h-12 rounded-md border-2 px-4 font-semibold transition-colors duration-150 ${
        decision === value ? pressed : "border-ink bg-surface text-ink hover:bg-concrete"
      }`}
    >
      {label}
    </button>
  );

  return (
    <div className="mt-3 border-t border-line pt-3">
      <p className="text-xl font-semibold">
        <span className="capitalize">{damage.type}</span>, {damage.location}
      </p>
      <p className="text-ink-soft">
        Severity: {damage.severity}. {findingVerdict(damage) === "unsure" && "The AI is not sure this is damage."}
      </p>
      <Confidence value={damage.confidence} />

      {canDecide ? (
        <div className="mt-3">
          <div className="grid grid-cols-2 gap-2">
            {choice("confirmed", "Confirm damage", "border-flag bg-flag text-white")}
            {choice("disputed", "Dispute flag", "border-ink bg-ink text-white")}
          </div>
          <p className="mt-2 text-sm text-ink-soft" aria-live="polite">
            {decision
              ? "Recorded. No credits move: people settle damage, not the AI."
              : "Your call. The AI only flags what it sees."}
          </p>
        </div>
      ) : (
        <p className="mt-3 font-medium">
          {decision === "confirmed" && `${ownerName} confirmed this as damage.`}
          {decision === "disputed" && `${ownerName} disputed this flag.`}
          {!decision && `Waiting for ${ownerName} to confirm or dispute.`}
        </p>
      )}
    </div>
  );
}

export function CompareReport({
  pickup,
  ret,
  ownerName,
  canDecide,
  onDecide,
}: {
  pickup: Inspection;
  ret: Inspection;
  ownerName: string;
  canDecide: boolean;
  onDecide: (findingKey: string, decision: OwnerDecision) => void;
}) {
  const results = ret.aiResult;
  if (!results) return null;

  const verdictOf = (slot: Slot) => slotVerdict(results[slot]);
  const bySeverity = [...SLOTS].sort((a, b) => ORDER.indexOf(verdictOf(a)) - ORDER.indexOf(verdictOf(b)));
  const count = (verdict: Verdict) => SLOTS.filter((slot) => verdictOf(slot) === verdict).length;
  const dash = results.dashboard;
  const driven = kmDriven(dash);

  const plate = (slot: Slot) => {
    const result = results[slot];
    const verdict = verdictOf(slot);
    const label = SLOT_LABELS[slot];
    return (
      <li key={slot} className={`${panel} flex overflow-hidden`}>
        <div className={`w-2 shrink-0 ${LOOK[verdict].bar}`} aria-hidden />
        <div className="min-w-0 flex-1 p-3 sm:p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="font-display text-2xl font-semibold">{label}</h3>
            <VerdictChip verdict={verdict} />
          </div>
          <div className="mt-2 grid grid-cols-2 gap-1.5">
            <Photo src={pickup.photos[slot]} caption="Pickup" alt={`${label} at pickup`} />
            <Photo src={ret.photos[slot]} caption="Return" alt={`${label} at return`} />
          </div>

          {!result && (
            <p className="mt-3 font-medium">
              The AI did not give an answer we could trust for this pair. Compare the two photos yourself.
            </p>
          )}
          {slot === "dashboard" && result?.odometer_km != null && (
            <p className="mt-3 tabular-nums">
              Odometer {result.odometer_before_km != null && `${km(result.odometer_before_km)} at pickup, `}
              {km(result.odometer_km)} at return.
              {result.fuel_level && ` Fuel at return: ${result.fuel_level}.`}
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
                onDecide={(decision) => onDecide(key, decision)}
              />
            );
          })}
          {result?.notes && <p className="mt-3 text-ink-soft">AI note: {result.notes}</p>}
        </div>
      </li>
    );
  };

  return (
    <section aria-labelledby="report-heading">
      <h2 id="report-heading" className={heading}>
        Return report
      </h2>
      <p className="mt-1 text-ink-soft">
        {ret.aiProvider === "watsonx"
          ? "Each pair was compared by IBM watsonx."
          : "Mock mode: these are sample answers, not a real AI reading of the photos."}{" "}
        The AI flags; {canDecide ? "you decide" : `${ownerName} decides`}.
      </p>

      <div className={`${panel} mt-3 p-3 sm:p-4`}>
        <ul className="flex flex-wrap gap-2">
          {ORDER.map((verdict) => (
            <li key={verdict}>
              <VerdictChip verdict={verdict} count={count(verdict)} />
            </li>
          ))}
        </ul>
        <dl className="mt-3 grid grid-cols-3 gap-2 border-t border-line pt-3">
          {[
            ["Driven", driven != null ? km(driven) : "Not read"],
            ["Odometer", dash?.odometer_km != null ? km(dash.odometer_km) : "Not read"],
            ["Fuel", dash?.fuel_level ?? "Not read"],
          ].map(([term, value]) => (
            <div key={term}>
              <dt className="text-sm text-ink-soft">{term}</dt>
              <dd className="font-display text-2xl font-semibold leading-tight tabular-nums sm:text-3xl">{value}</dd>
            </div>
          ))}
        </dl>
      </div>

      <ul className="mt-3 space-y-3">{bySeverity.filter((slot) => verdictOf(slot) !== "clear").map(plate)}</ul>
      <ul className="mt-3 grid gap-3 sm:grid-cols-2">{bySeverity.filter((slot) => verdictOf(slot) === "clear").map(plate)}</ul>
    </section>
  );
}
