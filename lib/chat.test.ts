import { expect, it } from "vitest";
import { messagesOf, sendMessage } from "./chat";
import { viewFor } from "./server/actions";
import type { State } from "./types";

// Guest has booked Owner's car. Other is a third person with no part in the trip.
const state: State = {
  users: [
    { id: "owner", name: "Owner", credits: 0 },
    { id: "guest", name: "Guest", credits: 0 },
    { id: "other", name: "Other", credits: 0 },
  ],
  cars: [{ id: "car-1", ownerId: "owner", airport: "DTW", model: "2019 Honda Civic", seats: 5, from: "2027-01-10", to: "2027-01-20" }],
  bookings: [{ id: "b1", carId: "car-1", userId: "guest", from: "2027-01-10", to: "2027-01-13", days: 3, status: "booked" }],
  inspections: [],
};
const at = "2027-01-09T15:00:00.000Z";

it("lets the borrower and the owner message each other, in order", () => {
  const next = sendMessage(sendMessage(state, "guest", "b1", "  Landing at 4pm  ", at), "owner", "b1", "Keys are in the locker", at);
  expect(messagesOf(next, "b1").map((m) => [m.from, m.text])).toEqual([
    ["guest", "Landing at 4pm"],
    ["owner", "Keys are in the locker"],
  ]);
});

it("refuses anyone else, an empty message and one that is too long", () => {
  expect(() => sendMessage(state, "other", "b1", "hi", at)).toThrow("Only the two people");
  expect(() => sendMessage(state, "guest", "b9", "hi", at)).toThrow("Only the two people");
  expect(() => sendMessage(state, "guest", "b1", "   ", at)).toThrow("Write a message");
  expect(() => sendMessage(state, "guest", "b1", "x".repeat(501), at)).toThrow("under 500");
});

it("shows a trip's messages only to its two people", () => {
  const sent = sendMessage(state, "guest", "b1", "Landing at 4pm", at);
  expect(viewFor(sent, "owner").messages).toHaveLength(1);
  expect(viewFor(sent, "guest").messages).toHaveLength(1);
  expect(viewFor(sent, "other").messages).toEqual([]);
  expect(viewFor(sent, "").messages).toEqual([]);
});
