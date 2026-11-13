// Messages between the two people on a trip: the borrower and the car's owner.
// Pure state changes, like lib/rules.ts: each returns a new state or throws a message a user can read.
import type { Booking, Car, Message, State } from "./types";

export const MAX_MESSAGE_CHARS = 500;

/** A trip's messages, oldest first. */
export const messagesOf = (state: State, bookingId: string): Message[] => (state.messages ?? []).filter((m) => m.bookingId === bookingId);

/** The trip and its car when this user is one of its two people, otherwise undefined. */
export function conversation(state: State, userId: string, bookingId: string): { booking: Booking; car: Car; otherId: string } | undefined {
  const booking = state.bookings.find((b) => b.id === bookingId);
  const car = state.cars.find((c) => c.id === booking?.carId);
  if (!booking || !car || !userId) return undefined;
  if (booking.userId === userId) return { booking, car, otherId: car.ownerId };
  if (car.ownerId === userId) return { booking, car, otherId: booking.userId };
  return undefined;
}

// shortcut: no limit on how many messages a trip holds or how fast they arrive. Add one before this is public.
export function sendMessage(state: State, userId: string, bookingId: string, text: string, at: string): State {
  if (!conversation(state, userId, bookingId)) throw new Error("Only the two people on a trip can message each other.");
  const body = text.trim();
  if (!body) throw new Error("Write a message first.");
  if (body.length > MAX_MESSAGE_CHARS) throw new Error(`Keep a message under ${MAX_MESSAGE_CHARS} characters.`);
  const messages = state.messages ?? [];
  return { ...state, messages: [...messages, { id: `m${messages.length + 1}`, bookingId, from: userId, text: body, at }] };
}
