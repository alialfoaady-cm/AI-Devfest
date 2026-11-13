// One describe block per rule in README section 6, in the README's order.
import { describe, expect, it } from "vitest";
import { availableCars, book, overlaps, returnCar, tripDays } from "./rules";
import type { State } from "./types";

// Owner "a" is away Dec 18 to Dec 30 and has left a car at DTW. "b" and "c" are travellers.
const base: State = {
  users: [
    { id: "a", name: "A", credits: 2 },
    { id: "b", name: "B", credits: 10 },
    { id: "c", name: "C", credits: 10 },
  ],
  cars: [
    { id: "car-a", ownerId: "a", airport: "DTW", model: "Hatchback", seats: 5, from: "2026-12-18", to: "2026-12-30" },
    { id: "car-b", ownerId: "b", airport: "YYZ", model: "Wagon", seats: 5, from: "2026-12-20", to: "2026-12-27" },
  ],
  bookings: [],
  inspections: [],
};

const credits = (state: State, id: string) => state.users.find((u) => u.id === id)!.credits;
const ids = (state: State, airport: string, from: string, to: string, userId: string) =>
  availableCars(state, airport, from, to, userId).map((c) => c.id);

describe("1 credit = 1 day", () => {
  it("counts Dec 20 to Dec 27 as 7 days", () => {
    expect(tripDays("2026-12-20", "2026-12-27")).toBe(7);
  });
  it("charges 7 credits for that trip", () => {
    const after = book(base, "b", "car-a", "2026-12-20", "2026-12-27");
    expect(after.bookings[0].days).toBe(7);
    expect(credits(after, "b")).toBe(3);
  });
});

describe("a car shows up only at the chosen airport, not for its owner, and only if its free window covers the whole trip", () => {
  it("shows the car at its airport", () => {
    expect(ids(base, "DTW", "2026-12-20", "2026-12-27", "b")).toEqual(["car-a"]);
  });
  it("hides cars at other airports", () => {
    expect(ids(base, "YYZ", "2026-12-20", "2026-12-27", "c")).toEqual(["car-b"]);
  });
  it("hides the searcher's own car", () => {
    expect(ids(base, "DTW", "2026-12-20", "2026-12-27", "a")).toEqual([]);
  });
  it("hides a car whose window starts after the trip starts", () => {
    expect(ids(base, "DTW", "2026-12-17", "2026-12-20", "b")).toEqual([]);
  });
  it("refuses to book your own car", () => {
    expect(() => book(base, "a", "car-a", "2026-12-20", "2026-12-21")).toThrow(/own car/);
  });
});

describe("the owner's return date is a hard cutoff", () => {
  it("hides the car for a trip ending after the owner lands", () => {
    expect(ids(base, "DTW", "2026-12-27", "2026-12-31", "b")).toEqual([]);
  });
  it("refuses a booking past the owner's return date", () => {
    expect(() => book(base, "b", "car-a", "2026-12-27", "2026-12-31")).toThrow(/owner lands/);
  });
  it("allows a trip that ends on the day the owner lands", () => {
    expect(ids(base, "DTW", "2026-12-27", "2026-12-30", "b")).toEqual(["car-a"]);
  });
});

describe("two bookings on the same car cannot overlap; back-to-back is allowed", () => {
  const booked = book(base, "b", "car-a", "2026-12-20", "2026-12-27");

  it("treats shared-day handovers as not overlapping", () => {
    expect(overlaps({ from: "2026-12-20", to: "2026-12-27" }, { from: "2026-12-27", to: "2026-12-29" })).toBe(false);
    expect(overlaps({ from: "2026-12-20", to: "2026-12-27" }, { from: "2026-12-26", to: "2026-12-29" })).toBe(true);
  });
  it("refuses an overlapping booking and hides the car from that search", () => {
    expect(() => book(booked, "c", "car-a", "2026-12-26", "2026-12-29")).toThrow(/overlap/);
    expect(ids(booked, "DTW", "2026-12-26", "2026-12-29", "c")).toEqual([]);
  });
  it("allows a pickup on the day the previous borrower returns", () => {
    expect(ids(booked, "DTW", "2026-12-27", "2026-12-29", "c")).toEqual(["car-a"]);
    expect(book(booked, "c", "car-a", "2026-12-27", "2026-12-29").bookings).toHaveLength(2);
  });
});

describe("a user cannot book without enough credits; credits are taken when the booking is made", () => {
  it("refuses a trip that costs more credits than the user has", () => {
    expect(() => book(base, "b", "car-a", "2026-12-18", "2026-12-30")).toThrow(/credits/);
  });
  it("takes the credits at booking time", () => {
    expect(credits(book(base, "b", "car-a", "2026-12-20", "2026-12-23"), "b")).toBe(7);
  });
});

describe("the owner earns the credits when the car is returned, not when it is booked", () => {
  const booked = book(base, "b", "car-a", "2026-12-20", "2026-12-27");

  it("pays the owner nothing at booking", () => {
    expect(credits(booked, "a")).toBe(2);
  });
  it("pays the owner 1 credit per day at return", () => {
    const returned = returnCar(booked, booked.bookings[0].id);
    expect(credits(returned, "a")).toBe(9);
    expect(returned.bookings[0].status).toBe("returned");
  });
});

describe("a returned booking cannot be returned a second time", () => {
  it("throws and pays nothing more", () => {
    const booked = book(base, "b", "car-a", "2026-12-20", "2026-12-27");
    const returned = returnCar(booked, booked.bookings[0].id);
    expect(() => returnCar(returned, returned.bookings[0].id)).toThrow(/already been returned/);
  });
});

describe("a trip must be at least 1 day", () => {
  it("refuses a same-day trip", () => {
    expect(() => book(base, "b", "car-a", "2026-12-20", "2026-12-20")).toThrow(/at least 1 day/);
    expect(ids(base, "DTW", "2026-12-20", "2026-12-20", "b")).toEqual([]);
  });
  it("refuses a trip that ends before it starts, or has no dates", () => {
    expect(() => book(base, "b", "car-a", "2026-12-22", "2026-12-20")).toThrow(/at least 1 day/);
    expect(() => book(base, "b", "car-a", "", "")).toThrow(/at least 1 day/);
  });
});
