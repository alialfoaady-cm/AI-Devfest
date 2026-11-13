"use client";

import { USD_PER_CREDIT } from "@/lib/config";
import { usd } from "@/lib/format";

/** How many credits go towards a price: as many as the person has, up to the price, or none. */
export function creditsToUse(cost: number, balance: number, useCredits: boolean) {
  return useCredits ? Math.min(Math.max(balance, 0), cost) : 0;
}

/** Pay with credits, with money, or with both: credits first and dollars for whatever is left. */
export function PayChoice({
  cost,
  balance,
  useCredits,
  onChange,
}: {
  cost: number;
  balance: number;
  useCredits: boolean;
  onChange: (useCredits: boolean) => void;
}) {
  const credits = creditsToUse(cost, balance, useCredits);
  const dollars = (cost - credits) * USD_PER_CREDIT;
  return (
    <fieldset className="rounded-xl bg-surface-2 p-3.5">
      <legend className="sr-only">How to pay</legend>
      <label className="flex cursor-pointer items-center gap-3 font-medium">
        <input
          type="checkbox"
          className="size-5 accent-green"
          checked={useCredits && balance > 0}
          disabled={balance <= 0}
          onChange={(event) => onChange(event.target.checked)}
        />
        Use my credits
        <span className="ml-auto text-sm font-normal text-ink-soft">You have {balance}</span>
      </label>
      <dl className="mt-3 space-y-1 text-sm">
        <div className="flex justify-between">
          <dt className="text-ink-soft">From your credits</dt>
          <dd className="font-semibold tabular-nums">{credits}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-ink-soft">To pay in dollars</dt>
          <dd className="font-semibold tabular-nums">{usd(dollars)}</dd>
        </div>
      </dl>
      {dollars > 0 && <p className="mt-2 text-xs text-ink-soft">1 credit = {usd(USD_PER_CREDIT)}. This is a demo: no card is charged.</p>}
    </fieldset>
  );
}
