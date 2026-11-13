"use client";

import { ArrowRight, CarProfile, CaretRight, MagnifyingGlass, Sparkle, X } from "@phosphor-icons/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { AirportInput } from "@/components/AirportInput";
import { openAuth } from "@/components/AuthForm";
import { DateRange } from "@/components/DateRange";
import { HowItWorks } from "@/components/HowItWorks";
import { PayChoice, creditsToUse } from "@/components/PayChoice";
import { Select } from "@/components/Select";
import { CarPhoto, Empty, Notice, btnPrimary, btnQuiet, heading, pageTitle, searchBar, segmentLabel, segmentShape } from "@/components/ui";
import { AIRPORT_OPTIONS, AIRPORTS, MILES_INCLUDED_PER_DAY, STARTING_CREDITS, USD_PER_CREDIT } from "@/lib/config";
import { makeOf } from "@/lib/cars";
import { isoDay, payText, plural, shortDate, usd } from "@/lib/format";
import { availableCars, tripCost, tripDays } from "@/lib/rules";
import type { Described } from "@/lib/search/describe";
import { act, useStore, useTask } from "@/lib/store";
import type { Car } from "@/lib/types";

const WHERE = [{ value: "", label: "Any airport", tag: "All" }, ...AIRPORT_OPTIONS];
const MOST_SEATS = 8;
const SEATS = [{ value: "1", label: "Any number" }, ...[2, 3, 4, 5, 6, 7, MOST_SEATS].map((n) => ({ value: String(n), label: `${n} or more` }))];

/** "2026-11-14" plus 5 -> "2026-11-19" */
function addDays(day: string, count: number) {
  const date = new Date(`${day}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + count);
  return date.toISOString().slice(0, 10);
}

const pill = "h-10 shrink-0 rounded-full border px-4 text-sm font-semibold transition-colors duration-150";

/**
 * The front door, open to everyone. Before a search it shows a row of cars for each airport.
 * Searching (the button, Enter, or picking an airport) turns the page into one list of every
 * matching car with filters above it. Picking a car opens the booking window; only pressing Book
 * there needs an account.
 */
export default function FindPage() {
  const { state, currentUserId } = useStore();
  const router = useRouter();
  const [search, setSearch] = useState(() => ({ airport: "", seats: "1", from: isoDay(1), to: isoDay(8) }));
  const [searched, setSearched] = useState(false);
  const [make, setMake] = useState("");
  const [picked, setPicked] = useState<Car | null>(null);
  const [useCredits, setUseCredits] = useState(true);
  const { busy, error, run, clearError } = useTask();
  const ai = useTask();
  const [understood, setUnderstood] = useState("");
  const booking = useRef<HTMLDialogElement>(null);

  const me = state.users.find((u) => u.id === currentUserId);
  const credits = me?.credits ?? 0;
  const days = tripDays(search.from, search.to);
  const validTrip = days >= 1;
  const cost = tripCost(days);
  // Credits first, dollars for the rest; or all dollars when the box is unticked.
  const creditsUsed = creditsToUse(cost, credits, useCredits);
  const firstName = (userId: string) => state.users.find((u) => u.id === userId)?.name.split(" ")[0] ?? "Owner";

  // One group for each airport that has cars. Before a search each is a row; after one they are joined into a list.
  const rows = (search.airport ? [search.airport] : Object.keys(AIRPORTS))
    .map((code) => ({
      code,
      cars: validTrip ? availableCars(state, code, search.from, search.to, currentUserId ?? "").filter((car) => car.seats >= Number(search.seats)) : [],
    }))
    .filter((row) => row.cars.length > 0);
  const found = rows.flatMap((row) => row.cars);
  const makes = [...new Set(found.map((car) => makeOf(car.model)))].sort();
  const activeMake = makes.includes(make) ? make : ""; // a make that the new search no longer has is dropped
  const shown = activeMake ? found.filter((car) => makeOf(car.model) === activeMake) : found;

  function showResults() {
    setSearched(true);
    window.scrollTo({ top: 0 });
  }

  // AI search: the server turns the sentence into filters (IBM watsonx, or its stand-in), and they are applied here.
  async function describe(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const text = String(new FormData(event.currentTarget).get("describe") ?? "");
    setUnderstood("");
    const filters = await ai.run(async () => {
      const response = await fetch("/api/search", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text }) });
      const answer = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(answer.error ?? "AI search did not answer. Try again.");
      return answer.filters as Described;
    });
    if (!filters) return;
    const seats = Math.min(filters.seats ?? 1, MOST_SEATS);
    const parts = [filters.airport && AIRPORTS[filters.airport], seats > 1 && `${seats} or more seats`, filters.make, filters.days && plural(filters.days, "day")].filter(Boolean);
    if (parts.length === 0) return setUnderstood("AI search found no airport, seat count, make or trip length in that. Try “7 seats in Orlando for 5 days”.");
    // A description is a fresh search: what it does not mention goes back to "any". The pick-up day stays.
    setSearch({ airport: filters.airport ?? "", seats: String(seats), from: search.from, to: filters.days ? addDays(search.from, filters.days) : search.to });
    setMake(filters.make ?? "");
    setUnderstood(`AI search looked for: ${parts.join(", ")}.`);
    (document.activeElement as HTMLElement | null)?.blur();
    showResults();
  }

  const carCard = (car: Car, className = "") => (
    <li key={car.id} className={`group relative ${className}`}>
      <div className="relative overflow-hidden rounded-[20px]">
        <CarPhoto photo={car.photo} model={car.model} id={car.id} className="aspect-[20/19] w-full transition-transform duration-500 ease-out group-hover:scale-[1.04]" />
        <span className="absolute left-3 top-3 rounded-full bg-canvas/90 px-2.5 py-1 text-xs font-semibold">Back by {shortDate(car.to)}</span>
      </div>
      <h3 className="mt-2.5 font-semibold leading-tight">
        {/* The button's hit area is stretched over the whole card. */}
        <button
          type="button"
          aria-haspopup="dialog"
          onClick={() => setPicked(car)}
          className="text-left outline-none after:absolute after:inset-0 after:rounded-[20px] focus-visible:after:outline-2 focus-visible:after:outline-offset-2 focus-visible:after:outline-ink"
        >
          {car.model}
        </button>
      </h3>
      <p className="text-sm text-ink-soft">
        {plural(car.seats, "seat")}
        {searched && !search.airport ? ` at ${car.airport}` : ""}, lent by {firstName(car.ownerId)}
      </p>
      <p className="mt-1 text-sm">
        <span className="font-semibold tabular-nums">{plural(cost, "credit")}</span>{" "}
        <span className="text-ink-soft">
          or {usd(cost * USD_PER_CREDIT)} for {plural(days, "day")}
        </span>
      </p>
    </li>
  );

  useEffect(() => {
    if (picked) booking.current?.showModal();
  }, [picked]);

  async function book() {
    if (!picked) return;
    if (!me) return openAuth(); // signing in there brings them straight back to this window
    const next = await run(() => act("book", { carId: picked.id, from: search.from, to: search.to, creditsUsed }));
    const mine = next?.bookings.filter((b) => b.userId === currentUserId && b.carId === picked.id).at(-1);
    if (mine) router.push(`/trips/${mine.id}`);
  }

  return (
    <>
      <section aria-labelledby="find-heading">
        {/* After a search the headline steps aside so the list starts right under the bar. */}
        <h1 id="find-heading" className={searched ? "sr-only" : `${pageTitle} text-center`}>
          Find a car where you land
        </h1>
        {!searched && <p className="mx-auto mt-2 max-w-xl text-center text-ink-soft">Land, unlock, drive. Pay with credits you earned lending your own car.</p>}

        <form
          className={`${searchBar} mx-auto max-w-3xl sm:grid-cols-[1.1fr_0.9fr_2fr_auto] ${searched ? "" : "mt-6"}`}
          onSubmit={(event) => {
            event.preventDefault();
            (document.activeElement as HTMLElement | null)?.blur();
            showResults();
          }}
        >
          <AirportInput value={search.airport} options={WHERE} onChange={(airport) => {
              setSearch({ ...search, airport });
              showResults();
            }}
          />
          <Select variant="segment" label="Seats" value={search.seats} options={SEATS} onChange={(seats) => setSearch({ ...search, seats })} />
          <DateRange calendarClass="max-sm:mt-19" labels={["Pick up", "Return"]} from={search.from} to={search.to} onChange={(from, to) => setSearch({ ...search, from, to })} />
          {/* A circle until the bar is in use, then it opens out to say what it does. */}
          <button
            type="submit"
            className="m-2 flex h-12 min-w-12 items-center justify-center rounded-full bg-green px-3.5 font-semibold text-on-green transition-[background-color,scale] duration-150 ease-out hover:bg-green-press active:scale-95"
          >
            <MagnifyingGlass size={20} weight="bold" aria-hidden />
            <span className="overflow-hidden whitespace-nowrap pl-2 transition-[max-width,opacity,padding] duration-300 ease-out sm:max-w-0 sm:pl-0 sm:opacity-0 sm:group-focus-within/search:max-w-20 sm:group-focus-within/search:pl-2 sm:group-focus-within/search:opacity-100">
              Search
            </span>
          </button>
        </form>

        {/* AI search: one sentence instead of the fields above. */}
        <form
          onSubmit={describe}
          className="mx-auto mt-3 grid max-w-3xl grid-cols-[1fr_auto] rounded-full border border-line bg-surface transition-colors duration-200 focus-within:border-ink"
        >
          <label className={`block min-w-0 cursor-text rounded-full ${segmentShape}`}>
            <span className={`${segmentLabel} flex items-center gap-1.5`}>
              <Sparkle size={14} weight="fill" aria-hidden className="text-green-ink" />
              AI search
            </span>
            <input
              name="describe"
              required
              maxLength={200}
              autoComplete="off"
              enterKeyHint="search"
              placeholder="Describe what you're looking for"
              // 16px text on phones so iOS does not zoom in; the placeholder can stay small.
              className="block h-5 w-full truncate bg-transparent text-base text-ink outline-none! placeholder:text-sm placeholder:text-ink-soft sm:text-sm"
            />
          </label>
          <button
            type="submit"
            aria-label="Search with AI"
            disabled={ai.busy}
            className="m-2 grid size-12 place-items-center rounded-full bg-ink text-canvas transition-[opacity,scale] duration-150 ease-out active:scale-95 disabled:opacity-40"
          >
            <ArrowRight size={20} weight="bold" aria-hidden />
          </button>
        </form>
        <div className="mx-auto mt-2 max-w-3xl empty:hidden">
          <Notice>{ai.error}</Notice>
        </div>
        {understood && (
          <p aria-live="polite" className="mx-auto mt-2 max-w-3xl px-6 text-sm text-ink-soft">
            {understood}
          </p>
        )}

        <p aria-live="polite" className="mt-4 flex flex-wrap justify-center gap-x-3 text-sm font-semibold">
          {validTrip ? (
            <span className="text-green-ink">
              {plural(days, "day")}, {plural(cost, "credit")} or {usd(cost * USD_PER_CREDIT)}
            </span>
          ) : (
            <span className="text-red">Pick a return date at least one day after pickup.</span>
          )}
          {me && <span className="text-ink-soft">You have {plural(credits, "credit")}</span>}
        </p>

        <div id="results" className="mt-8 space-y-10">
          {searched ? (
            <section aria-labelledby="results-heading">
              <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
                <div>
                  <h2 id="results-heading" className={heading} aria-live="polite">
                    {plural(shown.length, "car")} {search.airport ? `at ${AIRPORTS[search.airport]}` : "at every airport"}
                  </h2>
                  <p className="text-ink-soft">
                    {shortDate(search.from)} to {shortDate(search.to)}, with {MILES_INCLUDED_PER_DAY} miles a day included. Each one is back before its owner lands.
                  </p>
                </div>
                <button
                  type="button"
                  className={`${pill} flex items-center gap-1.5 border-line pl-3 hover:border-ink`}
                  onClick={() => {
                    setSearch({ ...search, airport: "", seats: "1" });
                    setMake("");
                    setSearched(false);
                  }}
                >
                  <X size={14} weight="bold" aria-hidden />
                  Clear search
                </button>
              </div>

              {/* Filters: the makes among the cars found. Airport, seats and dates are in the bar above. */}
              {makes.length > 1 && (
                <div role="group" aria-label="Make" className="-mx-1 mt-4 flex gap-2 overflow-x-auto p-1 [scrollbar-width:none]">
                  {["", ...makes].map((name) => (
                    <button
                      key={name}
                      type="button"
                      aria-pressed={activeMake === name}
                      onClick={() => setMake(name)}
                      className={`${pill} ${activeMake === name ? "border-ink bg-ink text-canvas" : "border-line hover:border-ink"}`}
                    >
                      {name || "All makes"}
                    </button>
                  ))}
                </div>
              )}

              <ul className="mt-5 grid grid-cols-2 gap-x-4 gap-y-8 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">{shown.map((car) => carCard(car))}</ul>
            </section>
          ) : (
            rows.map(({ code, cars }) => (
              <section key={code} aria-labelledby={`cars-${code}`}>
                <div className="flex items-center justify-between gap-3">
                  <h2 id={`cars-${code}`} className={heading}>
                    Cars at {AIRPORTS[code]}
                  </h2>
                  <button
                    type="button"
                    onClick={() => {
                      setSearch({ ...search, airport: code });
                      showResults();
                    }}
                    className="flex h-9 shrink-0 items-center gap-1 rounded-full pl-3 pr-2 text-sm font-semibold transition-colors duration-150 hover:bg-surface"
                  >
                    Show all
                    <CaretRight size={14} weight="bold" aria-hidden />
                  </button>
                </div>
                <p className="text-ink-soft">
                  {shortDate(search.from)} to {shortDate(search.to)}, with {MILES_INCLUDED_PER_DAY} miles a day included. Each one is back before its owner lands.
                </p>
                {/* One row per airport that you can swipe along. */}
                <ul className="-m-1 mt-3 flex snap-x gap-4 overflow-x-auto p-1 [scrollbar-width:none]">{cars.map((car) => carCard(car, "w-60 shrink-0 snap-start"))}</ul>
              </section>
            ))
          )}

          {validTrip && rows.length === 0 && (
            <Empty
              icon={CarProfile}
              title={search.airport ? `No cars at ${AIRPORTS[search.airport]} for those dates yet` : "No cars for those dates yet"}
              action={
                <Link href="/lend/new" className={btnQuiet}>
                  List my car
                </Link>
              }
            >
              {search.seats === "1" ? "Try other dates." : "Try other dates or fewer seats."} If you park at the airport when you fly, your car could be the first.
            </Empty>
          )}
        </div>

        {!me && !searched && <HowItWorks />}
      </section>

      <dialog
        ref={booking}
        aria-labelledby="book-title"
        onClose={() => {
          setPicked(null);
          clearError();
        }}
        className="pop m-auto w-[min(92vw,26rem)] overflow-y-auto overscroll-contain rounded-3xl border border-line bg-surface p-0 text-ink backdrop:bg-black/60"
      >
        {picked && (
          <>
            <CarPhoto photo={picked.photo} model={picked.model} id={picked.id} className="aspect-[3/2] w-full" />
            <div className="space-y-4 p-5">
              <div>
                <h2 id="book-title" className={heading}>
                  {picked.model}
                </h2>
                <p className="mt-1 text-ink-soft">
                  {plural(picked.seats, "seat")}, lent by {firstName(picked.ownerId)} at {AIRPORTS[picked.airport]}
                </p>
              </div>
              <dl className="grid grid-cols-2 gap-2">
                {[
                  ["Pick up", shortDate(search.from)],
                  ["Return", shortDate(search.to)],
                ].map(([term, value]) => (
                  <div key={term} className="rounded-xl bg-surface-2 px-3.5 py-2.5">
                    <dt className="text-sm text-ink-soft">{term}</dt>
                    <dd className="font-semibold">{value}</dd>
                  </div>
                ))}
              </dl>
              <div className="border-t border-line pt-4">
                <p className="flex items-baseline justify-between">
                  <span>{plural(days, "day")}</span>
                  <span className="text-right">
                    <span className="text-xl font-bold tabular-nums">{plural(cost, "credit")}</span>
                    <span className="block text-sm text-ink-soft">or {usd(cost * USD_PER_CREDIT)}</span>
                  </span>
                </p>
                <p className="mt-1 text-sm text-ink-soft">
                  One credit is one mile. This covers {days * MILES_INCLUDED_PER_DAY} miles, {MILES_INCLUDED_PER_DAY} a day. Each mile past that costs 1 more credit, paid when
                  you return the car.
                </p>
              </div>
              <p className="text-sm text-ink-soft">
                {me
                  ? `You pay now. ${firstName(picked.ownerId)} is paid in credits when you return the car. You see the exact parking spot once you book.`
                  : `You need an account to book. New accounts start with ${STARTING_CREDITS} credits.`}
              </p>
              {me && <PayChoice cost={cost} balance={credits} useCredits={useCredits} onChange={setUseCredits} />}
              <Notice>{error}</Notice>
              {/* Book gets the room it needs; a long price wraps onto a second line inside the button. */}
              <div className="grid grid-cols-[auto_1fr] gap-2">
                <button type="button" className={btnQuiet} onClick={() => booking.current?.close()}>
                  Cancel
                </button>
                <button type="button" className={`${btnPrimary} h-auto! min-h-12 py-2 leading-tight text-balance`} disabled={busy} onClick={book}>
                  {me ? `Book for ${payText({ credits: creditsUsed, usd: (cost - creditsUsed) * USD_PER_CREDIT })}` : "Log in to book"}
                </button>
              </div>
            </div>
          </>
        )}
      </dialog>
    </>
  );
}
