// Booking rules from README section 6. Pure functions: no UI, no storage.
// Every function returns a new state and throws an Error with a message a user can read.

import type { Car, State } from "./types";

type Range = { from: string; to: string };

/** Whole days between two dates. 1 credit = 1 day. */
export function tripDays(from: string, to: string): number {
  return Math.round((Date.parse(to) - Date.parse(from)) / 86_400_000);
}

/** Back-to-back is not an overlap: one trip may end the day the next begins. */
export function overlaps(a: Range, b: Range): boolean {
  return a.from < b.to && b.from < a.to;
}

function insideOwnerWindow(car: Car, trip: Range): boolean {
  return car.from <= trip.from && trip.to <= car.to;
}

function hasOverlap(state: State, carId: string, trip: Range): boolean {
  return state.bookings.some((b) => b.carId === carId && overlaps(b, trip));
}

export function availableCars(
  state: State,
  airport: string,
  from: string,
  to: string,
  userId: string,
): Car[] {
  if (!(tripDays(from, to) >= 1)) return [];
  const trip = { from, to };
  return state.cars.filter(
    (car) =>
      car.airport === airport &&
      car.ownerId !== userId &&
      insideOwnerWindow(car, trip) &&
      !hasOverlap(state, car.id, trip),
  );
}

export function book(state: State, userId: string, carId: string, from: string, to: string): State {
  const days = tripDays(from, to);
  if (!(days >= 1)) throw new Error("A trip must be at least 1 day.");

  const user = state.users.find((u) => u.id === userId);
  const car = state.cars.find((c) => c.id === carId);
  if (!user || !car) throw new Error("That user or car does not exist.");
  if (car.ownerId === userId) throw new Error("You cannot book your own car.");

  const trip = { from, to };
  if (!insideOwnerWindow(car, trip)) {
    throw new Error(`This car is free from ${car.from} until its owner lands on ${car.to}.`);
  }
  if (hasOverlap(state, carId, trip)) {
    throw new Error("Those dates overlap another booking on this car.");
  }
  if (user.credits < days) {
    throw new Error(`This trip costs ${days} credits and you have ${user.credits}.`);
  }

  return {
    ...state,
    users: state.users.map((u) => (u.id === userId ? { ...u, credits: u.credits - days } : u)),
    bookings: [
      ...state.bookings,
      { id: `b${state.bookings.length + 1}`, carId, userId, from, to, days, status: "booked" },
    ],
  };
}

export function returnCar(state: State, bookingId: string): State {
  const booking = state.bookings.find((b) => b.id === bookingId);
  if (!booking) throw new Error("That booking does not exist.");
  if (booking.status === "returned") throw new Error("This car has already been returned.");

  const ownerId = state.cars.find((c) => c.id === booking.carId)?.ownerId;
  return {
    ...state,
    users: state.users.map((u) =>
      u.id === ownerId ? { ...u, credits: u.credits + booking.days } : u,
    ),
    bookings: state.bookings.map((b) => (b.id === bookingId ? { ...b, status: "returned" } : b)),
  };
}
