import { lockerCode } from "@/lib/inspections";

export function LockerCode({ bookingId }: { bookingId: string }) {
  const code = lockerCode(bookingId);
  return (
    <section aria-labelledby="locker-heading" className="bay-stripes rounded-lg p-1.5">
      <div className="rounded-md bg-surface p-4 text-center">
        <h2 id="locker-heading" className="font-display text-2xl font-semibold">
          Key locker code
        </h2>
        <p className="mt-2 flex justify-center gap-2" aria-label={`Code ${code.split("").join(" ")}`}>
          {code.split("").map((digit, index) => (
            <span
              key={index}
              aria-hidden
              className="flex h-16 w-12 items-center justify-center rounded-md bg-ink font-display text-5xl font-bold text-lane"
            >
              {digit}
            </span>
          ))}
        </p>
        <p className="mt-2 text-sm text-ink-soft">Unlocked by your pickup photos. A made-up code: there is no real locker.</p>
      </div>
    </section>
  );
}
