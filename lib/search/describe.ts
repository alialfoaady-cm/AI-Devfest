// AI search: a sentence in, search filters out.
// This file is the stand-in that runs until IBM watsonx.ai is connected. It only looks for words it
// knows. The watsonx adapter (lib/search/watsonx.ts, not built yet) has the SearchAdapter shape, and
// app/api/search/route.ts picks between the two and validates whatever comes back.
import { AIRPORTS } from "../config";

/** What was understood. A missing field means the sentence did not say. */
export type Described = { airport?: string; seats?: number; make?: string; days?: number };

/** What every search provider implements: the sentence and the makes on offer in, the raw answer out. */
export type SearchAdapter = (text: string, makes: string[]) => Promise<unknown>;

const NUMBERS: Record<string, number> = { a: 1, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9 };
// Words in airport names that do not point at one airport. "tacoma" is also a Toyota.
const NOT_A_PLACE = ["international", "metro", "tacoma"];

/** The words that name an airport: its code, and each distinctive word of its name ("orlando", "o'hare" as "hare"). */
const airportWords = (code: string) => [
  code.toLowerCase(),
  ...AIRPORTS[code]
    .toLowerCase()
    .split(/[^a-z]+/)
    .filter((word) => word.length >= 4 && !NOT_A_PLACE.includes(word)),
];

// shortcut: word matching, so "next Friday" or "something roomy" mean nothing to it. That is the part IBM replaces.
export function describeSearch(text: string, makes: string[]): Described {
  const said = text.toLowerCase().replace(/\b[a-z]+\b/g, (word) => (Object.hasOwn(NUMBERS, word) ? String(NUMBERS[word]) : word));
  const words = new Set(said.split(/[^a-z0-9]+/));

  const seats = said.match(/(\d+)[\s-]*(?:seats?|seaters?|people|persons?|passengers?|adults|of us)\b/) ?? said.match(/\b(?:family|group|party) of (\d+)/);
  const length = said.match(/(\d+)[\s-]*(day|night|week)s?\b/);

  return {
    airport: Object.keys(AIRPORTS).find((code) => airportWords(code).some((word) => words.has(word))),
    seats: seats ? Number(seats[1]) : undefined,
    make: makes.find((make) => words.has(make.toLowerCase())),
    days: length ? Number(length[1]) * (length[2] === "week" ? 7 : 1) : words.has("weekend") ? 3 : undefined,
  };
}

/** Keeps only the parts of a provider's answer that make sense. A provider is never trusted to be right. */
export function parseDescribed(raw: unknown, makes: string[]): Described {
  const answer = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const whole = (value: unknown, max: number) => (Number.isInteger(value) && (value as number) >= 1 && (value as number) <= max ? (value as number) : undefined);
  return {
    airport: typeof answer.airport === "string" && answer.airport in AIRPORTS ? answer.airport : undefined,
    seats: whole(answer.seats, 9),
    make: makes.find((make) => make === answer.make),
    days: whole(answer.days, 60),
  };
}
