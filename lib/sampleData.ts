// Made-up demo data. No real people, plates, addresses or locker codes.
import { SLOTS, type Photos, type State } from "./types";

export const SAMPLE_STATE: State = {
  users: [
    { id: "user-a", name: "Avery (demo A)", credits: 2 },
    { id: "user-b", name: "Blake (demo B)", credits: 10 },
  ],
  cars: [
    {
      id: "car-a",
      ownerId: "user-a",
      airport: "DTW",
      model: "Blue hatchback",
      seats: 5,
      from: "2026-12-18",
      to: "2026-12-30",
    },
    {
      id: "car-b",
      ownerId: "user-b",
      airport: "YYZ",
      model: "Green wagon",
      seats: 5,
      from: "2026-12-20",
      to: "2026-12-27",
    },
  ],
  bookings: [],
  inspections: [],
};

export const DEFAULT_USER_ID = "user-b";
export const DEFAULT_SEARCH = { airport: "DTW", from: "2026-12-20", to: "2026-12-27" };

// Drawn placeholders from scripts/make-samples.mjs. To demo with the toy car,
// replace the files in public/samples and keep the names.
const samplePhotos = (phase: "pickup" | "return") =>
  Object.fromEntries(SLOTS.map((slot) => [slot, `/samples/${phase}-${slot}.svg`])) as Photos;

export const SAMPLE_PICKUP_PHOTOS = samplePhotos("pickup");
export const SAMPLE_RETURN_PHOTOS = samplePhotos("return");
