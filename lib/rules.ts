// Booking rules from README section 6. Pure functions: no UI, no storage.
// Every function returns a new state and throws an Error with a message a user can read.

import {
  CANCELLATION_CUT,
  CREDITS_PER_DAY,
  CREDITS_PER_EXTRA_MILE,
  INSURANCE_CREDITS_PER_DAY,
  KM_PER_MILE,
  MILES_INCLUDED_PER_DAY,
  PARKING_FEE_PER_DAY_USD_ESTIMATE,
  USD_PER_CREDIT,
} from "./config";
import type { Booking, Car, MileageCharge, Payment, State } from "./types";

type Range = { from: string; to: string };

/** Whole days between two dates. */
export function tripDays(from: string, to: string): number {
  return Math.round((Date.parse(to) - Date.parse(from)) / 86_400_000);
}

/** What a trip costs to book: 35 credits a day, which is the 35 miles a day it includes at 1 credit a mile. */
export const tripCost = (days: number) => days * CREDITS_PER_DAY;

/** What cover for a trip costs: 10 credits a day. */
export const insuranceCost = (days: number) => days * INSURANCE_CREDITS_PER_DAY;

/**
 * A price paid with some credits and the rest in dollars, at $1.50 a credit.
 * shortcut: there is no payment provider, so the dollar part is recorded, not charged.
 * Add one before any real money is involved.
 */
export function splitPayment(cost: number, creditsUsed: number): Payment {
  if (!Number.isInteger(creditsUsed) || creditsUsed < 0 || creditsUsed > cost) {
    throw new Error(`Choose how many credits to use, from 0 to ${cost}.`);
  }
  return { credits: creditsUsed, usd: (cost - creditsUsed) * USD_PER_CREDIT };
}

/** Back-to-back is not an overlap: one trip may end the day the next begins. */
export function overlaps(a: Range, b: Range): boolean {
  return a.from < b.to && b.from < a.to;
}

function insideOwnerWindow(car: Car, trip: Range): boolean {
  return car.from <= trip.from && trip.to <= car.to;
}

function hasOverlap(state: State, carId: string, trip: Range): boolean {
  return state.bookings.some((b) => b.carId === carId && b.status !== "cancelled" && overlaps(b, trip));
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

/** `creditsUsed` is how much of the price comes from credits; the rest is paid in dollars. Left out, it is all credits. */
export function book(state: State, userId: string, carId: string, from: string, to: string, creditsUsed?: number): State {
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
  const cost = tripCost(days);
  const paid = splitPayment(cost, creditsUsed ?? cost);
  if (user.credits < paid.credits) {
    throw new Error(`This trip costs ${cost} credits and you have ${user.credits}. Pay the rest in dollars.`);
  }

  return {
    ...state,
    users: state.users.map((u) => (u.id === userId ? { ...u, credits: u.credits - paid.credits } : u)),
    bookings: [
      ...state.bookings,
      { id: `b${state.bookings.length + 1}`, carId, userId, from, to, days, status: "booked", paid },
    ],
  };
}

/**
 * Cover for one trip, bought by its borrower before pickup. It moves nothing later: it only
 * records that Sayara, not the borrower, pays for damage the owner confirms.
 */
export function insureTrip(state: State, userId: string, bookingId: string, creditsUsed?: number): State {
  const booking = state.bookings.find((b) => b.id === bookingId && b.userId === userId);
  const user = state.users.find((u) => u.id === userId);
  if (!booking || !user) throw new Error("That trip is not yours.");
  if (booking.insurance) throw new Error("This trip is already covered.");
  if (booking.status !== "booked" || state.inspections.some((i) => i.bookingId === bookingId)) {
    throw new Error("Cover has to be bought before you pick up the car.");
  }
  const cost = insuranceCost(booking.days);
  const paid = splitPayment(cost, creditsUsed ?? cost);
  if (user.credits < paid.credits) {
    throw new Error(`This cover costs ${cost} credits and you have ${user.credits}. Pay the rest in dollars.`);
  }
  return {
    ...state,
    users: state.users.map((u) => (u.id === userId ? { ...u, credits: u.credits - paid.credits } : u)),
    bookings: state.bookings.map((b) => (b.id === bookingId ? { ...b, insurance: paid } : b)),
  };
}

/**
 * What cancelling a trip costs, in credits: the other person's airport parking for the trip's
 * days, plus Sayara's 15% on top.
 */
export function cancellationFee(days: number) {
  const parking = Math.round((days * PARKING_FEE_PER_DAY_USD_ESTIMATE) / USD_PER_CREDIT);
  const cut = Math.round(parking * CANCELLATION_CUT);
  return { parking, cut, total: parking + cut };
}

/** What the borrower paid for a trip and its cover: all of it comes back if the trip is cancelled. */
export function refundOf(booking: Booking): Payment {
  const trip = booking.paid ?? { credits: tripCost(booking.days), usd: 0 };
  return { credits: trip.credits + (booking.insurance?.credits ?? 0), usd: trip.usd + (booking.insurance?.usd ?? 0) };
}

/**
 * Either person on a trip can cancel it before pickup. The borrower gets their payment back.
 * Whoever cancels pays the fee: the parking part goes to the other person, the rest to Sayara.
 */
export function cancelBooking(state: State, userId: string, bookingId: string, creditsUsed?: number): State {
  const booking = state.bookings.find((b) => b.id === bookingId);
  const ownerId = state.cars.find((c) => c.id === booking?.carId)?.ownerId;
  if (!booking || !ownerId || (booking.userId !== userId && ownerId !== userId)) throw new Error("That trip is not yours.");
  if (booking.status !== "booked" || state.inspections.some((i) => i.bookingId === bookingId)) {
    throw new Error("A trip can only be cancelled before pickup.");
  }

  const fee = cancellationFee(booking.days);
  const paid = splitPayment(fee.total, creditsUsed ?? fee.total);
  const refund = refundOf(booking);
  const otherId = userId === booking.userId ? ownerId : booking.userId;
  const change = (id: string) =>
    (id === booking.userId ? refund.credits : 0) - (id === userId ? paid.credits : 0) + (id === otherId ? fee.parking : 0);
  const canceller = state.users.find((u) => u.id === userId);
  if (!canceller || canceller.credits + change(userId) < 0) {
    throw new Error(`Cancelling costs ${fee.total} credits and you do not have that many. Pay the rest in dollars.`);
  }

  return {
    ...state,
    users: state.users.map((u) => ({ ...u, credits: u.credits + change(u.id) })),
    bookings: state.bookings.map((b) =>
      b.id === bookingId ? { ...b, status: "cancelled", cancelled: { by: userId, fee: paid, parkingCredits: fee.parking, refund } } : b,
    ),
  };
}

/**
 * A trip includes 35 miles a day. Each mile past the total costs a credit. (With another rate
 * the charge is rounded to whole credits: nobody pays a fraction.)
 */
export function mileageCharge(days: number, kmDriven: number, creditsPerExtraMile = CREDITS_PER_EXTRA_MILE): MileageCharge {
  const miles = Math.round(kmDriven / KM_PER_MILE);
  const included = days * MILES_INCLUDED_PER_DAY;
  const extraMiles = Math.max(0, miles - included);
  return { miles, included, extraMiles, credits: Math.round(extraMiles * creditsPerExtraMile) };
}

/**
 * The owner is paid what the trip cost to book. With the kilometres driven (read from the two dashboard photos),
 * any extra miles are paid too, by the borrower. A borrower who booked with their last credits
 * goes below zero and has to lend to get back above it: book() already refuses a low balance.
 */
export function returnCar(state: State, bookingId: string, kmDriven: number | null = null): State {
  const booking = state.bookings.find((b) => b.id === bookingId);
  if (!booking) throw new Error("That booking does not exist.");
  if (booking.status === "returned") throw new Error("This car has already been returned.");
  if (booking.status === "cancelled") throw new Error("This trip was cancelled.");

  const ownerId = state.cars.find((c) => c.id === booking.carId)?.ownerId;
  const mileage = kmDriven === null ? undefined : mileageCharge(booking.days, kmDriven);
  const extra = mileage?.credits ?? 0;
  return {
    ...state,
    users: state.users.map((u) => {
      if (u.id === ownerId) return { ...u, credits: u.credits + tripCost(booking.days) + extra };
      if (u.id === booking.userId) return { ...u, credits: u.credits - extra };
      return u;
    }),
    bookings: state.bookings.map((b) => (b.id === bookingId ? { ...b, status: "returned", mileage } : b)),
  };
}
