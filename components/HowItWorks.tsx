import { Coins, Key, MapPin } from "@phosphor-icons/react";
import { CREDITS_PER_DAY, MILES_INCLUDED_PER_DAY } from "@/lib/config";
import { AirportMap } from "./AirportMap";
import { card } from "./ui";

const STEPS = [
  { Icon: MapPin, name: "Lend", detail: "Park at the airport, drop a pin on your car and leave the key in a locker." },
  { Icon: Coins, name: "Earn", detail: `Every day a traveller borrows it earns you ${CREDITS_PER_DAY} credits.` },
  { Icon: Key, name: "Borrow", detail: `Spend credits on a car where you land. One credit is one mile, and a day includes ${MILES_INCLUDED_PER_DAY}.` },
];

/** What Sayara is, for a visitor who has not signed in yet. Shown under the cars they can already browse. */
export function HowItWorks() {
  return (
    <section aria-labelledby="how-heading" className="mt-16 grid gap-8 border-t border-line pt-12 lg:grid-cols-2 lg:items-center lg:gap-16">
      <div>
        <h2 id="how-heading" className="text-3xl font-bold leading-[1.1] tracking-[-0.03em] sm:text-4xl">
          Lend your car at the airport. Borrow one where you land.
        </h2>
        <p className="mt-3 max-w-md text-lg text-ink-soft">No money changes hands. A day lent is a day you can borrow.</p>
        <ol className="mt-6 space-y-3">
          {STEPS.map(({ Icon, name, detail }) => (
            <li key={name} className={`${card} flex items-start gap-4 p-4`}>
              <span className="grid size-13 shrink-0 place-items-center rounded-xl bg-green-soft text-green-ink">
                <Icon size={26} weight="fill" aria-hidden />
              </span>
              <div>
                <h3 className="text-lg font-bold leading-tight tracking-tight">{name}</h3>
                <p className="mt-0.5 text-ink-soft">{detail}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>
      <AirportMap />
    </section>
  );
}
