import { expect, test } from "vitest";
import type { State } from "../types";
import { applyAction, viewFor } from "./actions";

// Two people: Owner has listed a car, Guest has credits to borrow it.
const state: State = {
  users: [
    { id: "owner", name: "Owner", credits: 0 },
    { id: "guest", name: "Guest", credits: 7 },
    { id: "other", name: "Other", credits: 7 },
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
  expect(next.users.find((u) => u.id === "guest")?.credits).toBe(4);
  expect(next.users.find((u) => u.id === "other")?.credits).toBe(7);
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
