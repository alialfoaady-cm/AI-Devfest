import { expect, test } from "vitest";
import type { State } from "../types";
import { applyAction, viewFor } from "./actions";

// Two people: Owner has listed a car, Guest has credits to borrow it.
const state: State = {
  users: [
    { id: "owner", name: "Owner", credits: 0 },
    { id: "guest", name: "Guest", credits: 245 },
    { id: "other", name: "Other", credits: 245 },
  ],
  cars: [
    {
      id: "car-1",
      ownerId: "owner",
      airport: "DTW",
      model: "2019 Honda Civic",
      seats: 5,
      from: "2027-01-10",
      to: "2027-01-20",
      pin: { lat: 42.2068, lng: -83.3555 },
      spot: "B-214",
    },
  ],
  bookings: [],
  inspections: [],
};

const trip = { carId: "car-1", from: "2027-01-10", to: "2027-01-13" };

test("a booking is made by whoever is signed in, whatever the browser sends", async () => {
  const next = await applyAction(state, "guest", "book", { ...trip, userId: "other" });
  expect(next.bookings[0].userId).toBe("guest");
  expect(next.users.find((u) => u.id === "guest")?.credits).toBe(245 - 105);
  expect(next.users.find((u) => u.id === "other")?.credits).toBe(245);
});

test("a visitor without an account can browse, and learns nothing private", async () => {
  const booked = await applyAction(state, "guest", "book", trip);
  const seen = viewFor({ ...booked, users: [{ id: "owner", name: "Olive Owner", credits: 3 }, ...booked.users.slice(1)] }, "");
  expect(seen.cars).toHaveLength(1);
  expect(seen.cars[0].pin).toBeUndefined();
  expect(seen.cars[0].spot).toBeUndefined();
  expect(seen.users).toEqual([{ id: "owner", name: "Olive", credits: 0 }]); // owners only, first names
  expect(seen.bookings[0]).toMatchObject({ carId: "car-1", userId: "" }); // the days are taken; by whom is not said
  expect(seen.inspections).toHaveLength(0);
  expect(() => applyAction(state, "", "book", trip)).toThrow();
});

test("what a trip cost and whether it is insured are only for its two people", async () => {
  const booked = await applyAction(state, "guest", "book", { ...trip, creditsUsed: 0 });
  const insured = await applyAction(booked, "guest", "insure", { bookingId: booked.bookings[0].id, creditsUsed: 30 });
  expect(viewFor(insured, "guest").bookings[0].insurance).toEqual({ credits: 30, usd: 0 });
  expect(viewFor(insured, "owner").bookings[0].paid).toEqual({ credits: 0, usd: 157.5 });
  expect(viewFor(insured, "other").bookings[0].paid).toBeUndefined();
  expect(viewFor(insured, "other").bookings[0].insurance).toBeUndefined();
  expect(viewFor(insured, "").bookings[0]).not.toHaveProperty("paid");
  expect(() => applyAction(insured, "other", "insure", { bookingId: booked.bookings[0].id })).toThrow(/not yours/);
});

test("dates must be real dates", () => {
  expect(() => applyAction(state, "guest", "book", { ...trip, to: "soon" })).toThrow();
});

test("only the owner can move a car's pin", () => {
  const move = { carId: "car-1", pin: { lat: 1, lng: 1 }, spot: "X" };
  expect(() => applyAction(state, "guest", "setParking", move)).toThrow("not yours");
  expect(() => applyAction(state, "owner", "setParking", { ...move, pin: { lat: 999, lng: 1 } })).toThrow();
});

test("only the borrower can save photos for a trip, and only the owner can decide on a flag", async () => {
  const booked = await applyAction(state, "guest", "book", trip);
  await expect(async () => applyAction(booked, "other", "savePickup", { bookingId: "b1", photos: {} })).rejects.toThrow("not yours");
  expect(() => applyAction(booked, "guest", "decideFinding", { inspectionId: "b1-return", findingKey: "back:0", decision: "confirmed" })).toThrow();
});

test("an unknown action is refused", () => {
  expect(() => applyAction(state, "guest", "constructor", {})).toThrow("does not exist");
});

test("where a car is parked is hidden until you book it", async () => {
  expect(viewFor(state, "guest").cars[0]).not.toHaveProperty("spot", "B-214");
  expect(viewFor(state, "guest").cars[0].pin).toBeUndefined();
  expect(viewFor(state, "owner").cars[0].spot).toBe("B-214");
  const booked = await applyAction(state, "guest", "book", trip);
  expect(viewFor(booked, "guest").cars[0].spot).toBe("B-214");
  expect(viewFor(booked, "other").cars[0].pin).toBeUndefined();
});

test("nobody sees another person's balance or another trip's photos", () => {
  const withPhotos: State = {
    ...state,
    bookings: [{ id: "b1", ...trip, userId: "guest", days: 3, status: "booked" }],
    inspections: [{ id: "b1-pickup", bookingId: "b1", phase: "pickup", photos: {} as never, aiResult: null, ownerDecision: {} }],
  };
  expect(viewFor(withPhotos, "other").users.find((u) => u.id === "guest")?.credits).toBe(0);
  expect(viewFor(withPhotos, "other").inspections).toHaveLength(0);
  expect(viewFor(withPhotos, "guest").inspections).toHaveLength(1);
  expect(viewFor(withPhotos, "owner").inspections).toHaveLength(1);
});
