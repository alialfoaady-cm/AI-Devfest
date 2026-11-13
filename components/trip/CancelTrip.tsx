"use client";

import { useRef, useState } from "react";
import { USD_PER_CREDIT } from "@/lib/config";
import { payText, plural, usd } from "@/lib/format";
import { cancellationFee } from "@/lib/rules";
import { act, useTask } from "@/lib/store";
import type { Payment } from "@/lib/types";
import { PayChoice, creditsToUse } from "../PayChoice";
import { Notice, btnQuiet, heading } from "../ui";

/**
 * Cancelling a trip before pickup, by its borrower or by the car's owner.
 * This window is the one place the cost of cancelling is shown: it is not on the listing or the booking.
 */
export function CancelTrip({
  bookingId,
  days,
  balance,
  refund,
  otherName,
}: {
  bookingId: string;
  days: number;
  balance: number;
  /** What comes back to the person cancelling before the fee: the borrower's payment. Zero for an owner. */
  refund: Payment;
  otherName: string;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [useCredits, setUseCredits] = useState(true);
  const { busy, error, run } = useTask();
  const fee = cancellationFee(days);
  const available = balance + refund.credits;
  const credits = creditsToUse(fee.total, available, useCredits);

  return (
    <>
      <button
        type="button"
        className="h-11 font-medium text-ink-soft underline decoration-line decoration-2 underline-offset-4 transition-colors duration-150 hover:text-ink"
        onClick={() => dialog.current?.showModal()}
      >
        Cancel this trip
      </button>

      <dialog
        ref={dialog}
        aria-labelledby="cancel-title"
        className="pop m-auto w-[min(92vw,26rem)] rounded-3xl border border-line bg-surface p-5 text-ink backdrop:bg-black/60"
      >
        <h2 id="cancel-title" className={heading}>
          Cancel this trip?
        </h2>
        <p className="mt-2 text-ink-soft">
          Cancelling costs {plural(fee.total, "credit")} or {usd(fee.total * USD_PER_CREDIT)}. That is {otherName}&apos;s parking for {plural(days, "day")} ({fee.parking}{" "}
          credits) and a 15% fee ({fee.cut}).
        </p>
        {(refund.credits > 0 || refund.usd > 0) && <p className="mt-2 text-ink-soft">You get back the {payText(refund)} you paid.</p>}

        <div className="mt-4 space-y-3">
          <PayChoice cost={fee.total} balance={available} useCredits={useCredits} onChange={setUseCredits} />
          <Notice>{error}</Notice>
          <button
            type="button"
            className="inline-flex h-13 w-full items-center justify-center rounded-[14px] bg-red px-5 text-center font-semibold text-canvas transition-[opacity,scale] duration-150 ease-out active:scale-[0.98] disabled:opacity-40"
            disabled={busy}
            onClick={() => run(() => act("cancel", { bookingId, creditsUsed: credits }))}
          >
            Cancel and pay {payText({ credits, usd: (fee.total - credits) * USD_PER_CREDIT })}
          </button>
          <button type="button" className={`${btnQuiet} w-full`} onClick={() => dialog.current?.close()}>
            Keep the trip
          </button>
        </div>
      </dialog>
    </>
  );
}
