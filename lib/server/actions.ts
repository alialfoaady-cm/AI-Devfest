// What a signed-in user may do and see. The browser asks; the server checks who is asking,
// checks the input, and then runs the same pure rules as before (lib/rules.ts, lib/cars.ts,
// lib/inspections.ts). Nothing here trusts a user id, a date or a photo sent by the browser.
import { listCar, setParking } from "../cars";
import { conversation, sendMessage } from "../chat";
import { parseInspectionResult } from "../inspection/validate";
import { decideFinding, savePickup, saveReturn } from "../inspections";
import { book, cancelBooking, insureTrip } from "../rules";
import { SLOTS, type InspectionResult, type Photos, type Slot, type State } from "../types";
import { savePhoto } from "./db";

type Payload = Record<string, unknown>;
type Handler = (state: State, me: string, payload: Payload) => State | Promise<State>;

export const inspectionProvider = () => (process.env.INSPECTION_PROVIDER === "watsonx" ? "watsonx" : "mock");

const isDate = (value: unknown): value is string =>
  typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(value));

function dates(payload: Payload): { from: string; to: string } {
  if (!isDate(payload.from) || !isDate(payload.to)) throw new Error("Pick both dates.");
  return { from: payload.from, to: payload.to };
}

const text = (value: unknown) => (typeof value === "string" ? value : "");

/** How many credits to put towards a price. Left out means all of it; the rules check the range. */
const creditsUsed = (payload: Payload) => (payload.creditsUsed === undefined ? undefined : Number(payload.creditsUsed));

/** A photo is a data URL from the camera. In mock mode the drawn samples are allowed too. */
async function photo(value: unknown): Promise<string> {
  if (inspectionProvider() === "mock" && typeof value === "string" && /^\/samples\/(pickup|return)-[a-z]+\.svg$/.test(value)) {
    return value;
  }
  return savePhoto(value);
}

async function sixPhotos(value: unknown): Promise<Photos> {
  const given = (value ?? {}) as Record<string, unknown>;
  const stored = {} as Photos;
  for (const slot of SLOTS) stored[slot] = await photo(given[slot]);
  return stored;
}

function myBooking(state: State, me: string, bookingId: unknown) {
  const booking = state.bookings.find((b) => b.id === bookingId && b.userId === me);
  if (!booking) throw new Error("That trip is not yours.");
  return booking;
}

const HANDLERS: Record<string, Handler> = {
  book: (state, me, payload) => {
    const { from, to } = dates(payload);
    return book(state, me, text(payload.carId), from, to, creditsUsed(payload));
  },

  insure: (state, me, payload) => insureTrip(state, me, text(payload.bookingId), creditsUsed(payload)),

  cancel: (state, me, payload) => cancelBooking(state, me, text(payload.bookingId), creditsUsed(payload)),

  listCar: async (state, me, payload) => {
    const car = (payload.car ?? {}) as Payload;
    const { from, to } = dates(car);
    // Check the listing with the rules first, so a refused listing leaves no photo behind.
    const draft = { model: text(car.model), seats: Number(car.seats), airport: text(car.airport), from, to };
    listCar(state, me, draft);
    return listCar(state, me, { ...draft, photo: car.photo ? await savePhoto(car.photo) : undefined });
  },

  setParking: (state, me, payload) => {
    if (!state.cars.some((car) => car.id === payload.carId && car.ownerId === me)) throw new Error("That car is not yours.");
    const pin = (payload.pin ?? {}) as Payload;
    const lat = Number(pin.lat);
    const lng = Number(pin.lng);
    if (!(Math.abs(lat) <= 90) || !(Math.abs(lng) <= 180)) throw new Error("Drop the pin on the map first.");
    return setParking(state, text(payload.carId), { pin: { lat, lng }, spot: text(payload.spot).trim().slice(0, 8) });
  },

  savePickup: async (state, me, payload) => {
    const booking = myBooking(state, me, payload.bookingId);
    return savePickup(state, booking.id, await sixPhotos(payload.photos));
  },

  saveReturn: async (state, me, payload) => {
    const booking = myBooking(state, me, payload.bookingId);
    // shortcut: the comparison results come from the browser, which got them from /api/inspect.
    // They are shape-checked here, but a borrower could send made-up ones. Run the comparison on
    // the server when pairs can be stitched there.
    const given = (payload.aiResult ?? {}) as Record<string, unknown>;
    const results = {} as Record<Slot, InspectionResult | null>;
    for (const slot of SLOTS) results[slot] = given[slot] == null ? null : parseInspectionResult(given[slot]);
    return saveReturn(state, booking.id, await sixPhotos(payload.photos), results, inspectionProvider());
  },

  // The time comes from the server's clock, never from the browser.
  sendMessage: (state, me, payload) => sendMessage(state, me, text(payload.bookingId), text(payload.text), new Date().toISOString()),

  decideFinding: (state, me, payload) => {
    const inspection = state.inspections.find((i) => i.id === payload.inspectionId);
    const booking = state.bookings.find((b) => b.id === inspection?.bookingId);
    if (!inspection || !state.cars.some((car) => car.id === booking?.carId && car.ownerId === me)) {
      throw new Error("Only the car's owner can decide on a flag.");
    }
    const key = text(payload.findingKey);
    const [slot, index] = key.split(":");
    if (!inspection.aiResult?.[slot as Slot]?.new_damage[Number(index)]) throw new Error("That flag does not exist.");
    if (payload.decision !== "confirmed" && payload.decision !== "disputed") throw new Error("Choose confirm or dispute.");
    return decideFinding(state, inspection.id, key, payload.decision);
  },
};

export function applyAction(state: State, me: string, type: unknown, payload: Payload): State | Promise<State> {
  const handler = typeof type === "string" && Object.hasOwn(HANDLERS, type) ? HANDLERS[type] : null;
  if (!handler) throw new Error("That action does not exist.");
  return handler(state, me, payload);
}

/**
 * The part of the data one user is allowed to see. Everyone sees which cars exist and when they are
 * booked (the search needs that). Where a car is parked is only for its owner and people who booked it;
 * photos, flags and messages are only for the two people on that trip; nobody sees another person's balance.
 */
export function viewFor(state: State, me: string): State {
  // Not signed in ("" for me): enough to browse cars and see which days are taken, and nothing about people
  // beyond an owner's first name.
  if (!me) {
    const owners = new Set(state.cars.map((car) => car.ownerId));
    return {
      users: state.users.filter((user) => owners.has(user.id)).map((user) => ({ ...user, name: user.name.split(" ")[0], credits: 0 })),
      cars: state.cars.map((car) => ({ ...car, pin: undefined, spot: undefined })),
      bookings: state.bookings.map(({ id, carId, from, to, days, status }) => ({ id, carId, from, to, days, status, userId: "" })),
      inspections: [],
      messages: [],
    };
  }
  const mine = (carId: string) => state.cars.some((car) => car.id === carId && car.ownerId === me);
  const booked = (carId: string) => state.bookings.some((b) => b.carId === carId && b.userId === me);
  return {
    users: state.users.map((user) => (user.id === me ? user : { ...user, credits: 0 })),
    cars: state.cars.map((car) => (mine(car.id) || booked(car.id) ? car : { ...car, pin: undefined, spot: undefined })),
    // Everyone needs the days a car is taken. What a trip cost, its miles and its cover are for its two people.
    bookings: state.bookings.map((b) => (b.userId === me || mine(b.carId) ? b : { ...b, paid: undefined, insurance: undefined, mileage: undefined, cancelled: undefined })),
    inspections: state.inspections.filter((inspection) => {
      const booking = state.bookings.find((b) => b.id === inspection.bookingId);
      return booking !== undefined && (booking.userId === me || mine(booking.carId));
    }),
    messages: (state.messages ?? []).filter((message) => conversation(state, me, message.bookingId)),
  };
}
