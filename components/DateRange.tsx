"use client";

// Two parts of a search bar, a first day and a last day, that share one calendar.
// It replaces the browser's own date picker, which looks different on every device.

import { CaretLeft, CaretRight } from "@phosphor-icons/react";
import { useEffect, useRef, useState } from "react";
import { isoDay, shortDate } from "@/lib/format";
import { segmentLabel, segmentShape } from "./ui";

const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const two = (n: number) => String(n).padStart(2, "0");
const addDays = (day: string, count: number) => new Date(Date.parse(day) + count * 86_400_000).toISOString().slice(0, 10);
const monthOf = (day: string) => ({ year: Number(day.slice(0, 4)), month: Number(day.slice(5, 7)) - 1 });
const long = (day: string, options: Intl.DateTimeFormatOptions) =>
  new Date(`${day}T00:00:00Z`).toLocaleDateString("en-US", { ...options, timeZone: "UTC" });

/** The days of a month as "YYYY-MM-DD", with a blank for each weekday before the 1st (weeks start on Sunday). */
export function monthGrid(year: number, month: number): (string | null)[] {
  const blanks = new Date(Date.UTC(year, month, 1)).getUTCDay();
  const days = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  return [...Array<null>(blanks).fill(null), ...Array.from({ length: days }, (_, i) => `${year}-${two(month + 1)}-${two(i + 1)}`)];
}

export function DateRange({
  from,
  to,
  onChange,
  labels,
  calendarClass = "",
}: {
  from: string;
  to: string;
  onChange: (from: string, to: string) => void;
  /** What the two days are called, such as ["Pick up", "Return"]. */
  labels: [string, string];
  /** Extra classes for the calendar, such as a larger gap to clear a button under the bar on phones. */
  calendarClass?: string;
}) {
  const wrap = useRef<HTMLDivElement>(null);
  // Which day the next tap sets, or null while the calendar is closed.
  const [picking, setPicking] = useState<"from" | "to" | null>(null);
  const [view, setView] = useState(() => monthOf(from));
  const today = isoDay();

  // A tap anywhere else, or Escape, closes it.
  useEffect(() => {
    if (!picking) return;
    const outside = (event: PointerEvent) => !wrap.current?.contains(event.target as Node) && setPicking(null);
    const escape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setPicking(null);
      wrap.current?.querySelector("button")?.focus();
    };
    document.addEventListener("pointerdown", outside);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("pointerdown", outside);
      document.removeEventListener("keydown", escape);
    };
  }, [picking]);

  function open(which: "from" | "to") {
    setView(monthOf(which === "from" ? from : to));
    setPicking(picking === which ? null : which);
  }

  function pick(day: string) {
    // A day on or before the first day cannot be the last day, so it starts the range again.
    if (picking === "from" || day <= from) {
      onChange(day, day < to ? to : addDays(day, 1));
      setPicking("to");
    } else {
      onChange(from, day);
      setPicking(null);
    }
  }

  // Arrow keys walk the days: left and right by one, up and down by a week.
  function onKeyDown(event: React.KeyboardEvent) {
    const step = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 }[event.key];
    const day = (event.target as HTMLElement).dataset.day;
    if (!step || !day) return;
    event.preventDefault();
    wrap.current?.querySelector<HTMLElement>(`[data-day="${addDays(day, step)}"]:not(:disabled)`)?.focus();
  }

  const move = (by: number) => setView(monthOf(new Date(Date.UTC(view.year, view.month + by, 1)).toISOString().slice(0, 10)));
  const atStart = `${view.year}-${two(view.month + 1)}` <= today.slice(0, 7);
  const second = monthOf(new Date(Date.UTC(view.year, view.month + 1, 1)).toISOString().slice(0, 10));

  const part = (which: "from" | "to", label: string, day: string) => (
    <button
      type="button"
      aria-haspopup="dialog"
      aria-expanded={picking === which}
      onClick={() => open(which)}
      className={`block w-full rounded-[2rem] sm:rounded-full ${segmentShape} outline-none focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ink ${
        picking === which ? "bg-canvas shadow-[0_3px_12px_rgb(0_0_0/0.12),0_1px_2px_rgb(0_0_0/0.1)]" : "hover:bg-surface-2"
      }`}
    >
      <span className={segmentLabel}>{label}</span>
      <span className="block h-5 text-sm text-ink-soft">{shortDate(day)}</span>
    </button>
  );

  return (
    <div ref={wrap} className="relative grid grid-cols-2">
      {part("from", labels[0], from)}
      {part("to", labels[1], to)}

      {picking && (
        <div
          role="dialog"
          aria-label={`Choose the ${labels[0].toLowerCase()} and ${labels[1].toLowerCase()} days`}
          onKeyDown={onKeyDown}
          className={`pop absolute left-1/2 top-full z-20 mt-3 w-[min(21rem,calc(100vw-2rem))] origin-top -translate-x-1/2 rounded-3xl border border-line bg-surface p-4 shadow-[0_8px_28px_rgb(0_0_0/0.28)] sm:w-[min(41rem,calc(100vw-3rem))] sm:p-5 ${calendarClass}`}
        >
          <div className="flex items-center justify-between">
            <button
              type="button"
              aria-label="Earlier month"
              disabled={atStart}
              onClick={() => move(-1)}
              className="grid size-9 place-items-center rounded-full hover:bg-surface-2 disabled:opacity-30 disabled:hover:bg-transparent"
            >
              <CaretLeft size={16} weight="bold" aria-hidden />
            </button>
            <p aria-live="polite" className="text-sm font-semibold text-ink-soft">
              {picking === "from" ? `Choose the ${labels[0].toLowerCase()} day` : `Choose the ${labels[1].toLowerCase()} day`}
            </p>
            <button type="button" aria-label="Later month" onClick={() => move(1)} className="grid size-9 place-items-center rounded-full hover:bg-surface-2">
              <CaretRight size={16} weight="bold" aria-hidden />
            </button>
          </div>

          <div className="mt-2 grid gap-8 sm:grid-cols-2">
            {[view, second].map(({ year, month }, index) => (
              // A phone has room for one month; the second one shows from the sm width up.
              <div key={`${year}-${month}`} className={index === 1 ? "max-sm:hidden" : ""}>
                <p className="text-center font-semibold">{long(`${year}-${two(month + 1)}-01`, { month: "long", year: "numeric" })}</p>
                <div className="mt-3 grid grid-cols-7 text-center text-xs font-medium text-ink-soft" aria-hidden>
                  {WEEKDAYS.map((name) => (
                    <span key={name}>{name.slice(0, 2)}</span>
                  ))}
                </div>
                <div className="mt-1 grid grid-cols-7 gap-y-0.5">
                  {monthGrid(year, month).map((day, cell) => {
                    if (!day) return <span key={cell} />;
                    const end = day === from || day === to;
                    const between = day > from && day < to;
                    return (
                      // The tinted band runs behind the days of the trip, with a round cap at each end.
                      <span
                        key={day}
                        className={`${between || end ? "bg-green-soft" : ""} ${day === from ? "rounded-l-full" : ""} ${day === to ? "rounded-r-full" : ""}`}
                      >
                        <button
                          type="button"
                          data-day={day}
                          disabled={day < today}
                          aria-label={long(day, { weekday: "long", month: "long", day: "numeric", year: "numeric" })}
                          aria-pressed={end}
                          onClick={() => pick(day)}
                          className={`grid aspect-square w-full place-items-center rounded-full text-sm tabular-nums transition-colors duration-150 disabled:text-ink-soft/40 ${
                            end ? "bg-green font-semibold text-on-green" : "enabled:hover:bg-surface-2"
                          } ${day === today && !end ? "font-bold underline decoration-2 underline-offset-4" : ""}`}
                        >
                          {Number(day.slice(8))}
                        </button>
                      </span>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
