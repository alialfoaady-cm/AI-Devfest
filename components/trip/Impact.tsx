import { IMPACT_LABEL, RENTAL_COST_PER_DAY_USD_ESTIMATE } from "@/lib/config";
import { plural } from "@/lib/format";

/** The dollar figure for judges. Its inputs are estimates and the screen says so. */
export function Impact({ days }: { days: number }) {
  return (
    <section aria-label="Impact" className="rounded-lg bg-lake p-4 text-white">
      <p className="flex flex-wrap items-baseline gap-x-3">
        <span className="font-display text-6xl font-bold leading-none tabular-nums">
          ${days * RENTAL_COST_PER_DAY_USD_ESTIMATE}
        </span>
        <span className="text-xl font-medium">{IMPACT_LABEL}</span>
      </p>
      <p className="mt-1 text-white/90">
        {plural(days, "day")} at about ${RENTAL_COST_PER_DAY_USD_ESTIMATE} a day for a rental car. No money changed hands.
      </p>
    </section>
  );
}
