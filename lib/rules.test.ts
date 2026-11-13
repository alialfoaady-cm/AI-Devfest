// One describe block per rule in README section 6, in the README's order.
import { describe, expect, it } from "vitest";
import { savePickup } from "./inspections";
import { availableCars, book, cancelBooking, cancellationFee, insureTrip, mileageCharge, overlaps, returnCar, splitPayment, tripDays } from "./rules";
import type { Photos } from "./types";
import type { State } from "./types";

// Owner "a" is away Dec 18 to Dec 30 and has left a car at DTW. "b" and "c" are travellers.
const base: State = {
  users: [
    { id: "a", name: "A", credits: 70 },
    { id: "b", name: "B", credits: 350 },
    { id: "c", name: "C", credits: 350 },
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

describe("1 credit = 1 mile, and a day includes 35: a day costs 35 credits", () => {
  it("counts Dec 20 to Dec 27 as 7 days", () => {
    expect(tripDays("2026-12-20", "2026-12-27")).toBe(7);
  });
  it("charges 245 credits for that trip", () => {
    const after = book(base, "b", "car-a", "2026-12-20", "2026-12-27");
    expect(after.bookings[0].days).toBe(7);
    expect(credits(after, "b")).toBe(350 - 245);
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
    expect(credits(book(base, "b", "car-a", "2026-12-20", "2026-12-23"), "b")).toBe(350 - 105);
  });
});

describe("the owner earns the credits when the car is returned, not when it is booked", () => {
  const booked = book(base, "b", "car-a", "2026-12-20", "2026-12-27");

  it("pays the owner nothing at booking", () => {
    expect(credits(booked, "a")).toBe(70);
  });
  it("pays the owner 35 credits per day at return", () => {
    const returned = returnCar(booked, booked.bookings[0].id);
    expect(credits(returned, "a")).toBe(70 + 245);
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

describe("a trip includes 35 miles a day; each mile past that costs 1 credit", () => {
  const km = (miles: number) => miles * 1.609344;
  const booked = book(base, "b", "car-a", "2026-12-20", "2026-12-27"); // 7 days, 245 miles included

  it("charges nothing inside the allowance", () => {
    expect(mileageCharge(7, km(245))).toEqual({ miles: 245, included: 245, extraMiles: 0, credits: 0 });
    expect(mileageCharge(1, km(10)).credits).toBe(0);
  });
  it("charges 1 credit for each extra mile", () => {
    expect(mileageCharge(7, km(245 + 1)).credits).toBe(1);
    expect(mileageCharge(7, km(245 + 48)).credits).toBe(48);
  });
  it("takes another rate when one is passed in, and rounds to whole credits", () => {
    expect(mileageCharge(1, km(135), 0.1).credits).toBe(10);
    expect(mileageCharge(1, km(35 + 17), 1 / 35).credits).toBe(0);
  });
  it("moves the extra credits from the borrower to the owner at return, below zero if need be", () => {
    const poor = { ...booked, users: booked.users.map((u) => (u.id === "b" ? { ...u, credits: 0 } : u)) };
    const returned = returnCar(poor, poor.bookings[0].id, km(245 + 70));
    expect(returned.bookings[0].mileage).toEqual({ miles: 315, included: 245, extraMiles: 70, credits: 70 });
    expect(credits(returned, "a")).toBe(70 + 245 + 70);
    expect(credits(returned, "b")).toBe(-70);
  });
  it("charges nothing for miles when the odometer could not be read", () => {
    const returned = returnCar(booked, booked.bookings[0].id);
    expect(returned.bookings[0].mileage).toBeUndefined();
    expect(credits(returned, "b")).toBe(credits(booked, "b"));
  });
});

describe("a price can be paid in credits, in dollars, or part in each: 1 credit = $1.50", () => {
  it("splits a price into the credits used and the dollars for the rest", () => {
    expect(splitPayment(245, 245)).toEqual({ credits: 245, usd: 0 });
    expect(splitPayment(245, 0)).toEqual({ credits: 0, usd: 367.5 });
    expect(splitPayment(245, 100)).toEqual({ credits: 100, usd: 217.5 });
  });
  it("refuses more credits than the price, fewer than none, or a fraction", () => {
    expect(() => splitPayment(245, 246)).toThrow();
    expect(() => splitPayment(245, -1)).toThrow();
    expect(() => splitPayment(245, 1.5)).toThrow();
  });
  it("books with money alone, taking no credits, and still pays the owner in credits", () => {
    const booked = book(base, "b", "car-a", "2026-12-20", "2026-12-27", 0);
    expect(credits(booked, "b")).toBe(350);
    expect(booked.bookings[0].paid).toEqual({ credits: 0, usd: 367.5 });
    expect(credits(returnCar(booked, booked.bookings[0].id), "a")).toBe(70 + 245);
  });
  it("books a trip the credits cannot cover, with dollars for the rest", () => {
    const booked = book(base, "b", "car-a", "2026-12-18", "2026-12-30", 350); // 12 days = 420 credits
    expect(credits(booked, "b")).toBe(0);
    expect(booked.bookings[0].paid).toEqual({ credits: 350, usd: 105 });
  });
  it("refuses to use credits the user does not have", () => {
    expect(() => book(base, "a", "car-b", "2026-12-20", "2026-12-27", 100)).toThrow(/credits/);
  });
});

describe("insurance is bought per trip, before pickup: 10 credits a day", () => {
  const booked = book(base, "b", "car-a", "2026-12-20", "2026-12-27"); // b has 105 credits left
  const id = booked.bookings[0].id;

  it("covers the trip and takes the credits", () => {
    const covered = insureTrip(booked, "b", id);
    expect(covered.bookings[0].insurance).toEqual({ credits: 70, usd: 0 });
    expect(credits(covered, "b")).toBe(105 - 70);
  });
  it("can be paid part in dollars", () => {
    expect(insureTrip(booked, "b", id, 20).bookings[0].insurance).toEqual({ credits: 20, usd: 75 });
  });
  it("is only for the trip's own borrower, and only once", () => {
    expect(() => insureTrip(booked, "c", id)).toThrow(/not yours/);
    expect(() => insureTrip(insureTrip(booked, "b", id), "b", id)).toThrow(/already/);
  });
  it("cannot be bought after pickup", () => {
    const pickedUp = savePickup(booked, id, {} as Photos);
    expect(() => insureTrip(pickedUp, "b", id)).toThrow(/before you pick up/);
  });
});

describe("cancelling before pickup: the canceller pays the other person's parking plus 15%", () => {
  const booked = book(base, "b", "car-a", "2026-12-20", "2026-12-27"); // b: 350 - 245 = 105, a: 70
  const id = booked.bookings[0].id;

  it("prices 7 days of parking at $140, which is 93 credits, plus a 15% cut of 14", () => {
    expect(cancellationFee(7)).toEqual({ parking: 93, cut: 14, total: 107 });
  });
  it("when the borrower cancels: they get the trip back, pay the fee, and the owner gets the parking", () => {
    const cancelled = cancelBooking(booked, "b", id);
    expect(credits(cancelled, "b")).toBe(105 + 245 - 107);
    expect(credits(cancelled, "a")).toBe(70 + 93);
    expect(cancelled.bookings[0]).toMatchObject({ status: "cancelled", cancelled: { by: "b", fee: { credits: 107, usd: 0 }, parkingCredits: 93 } });
  });
  it("when the owner cancels: the borrower gets the trip back and the parking, and the owner pays", () => {
    const cancelled = cancelBooking(booked, "a", id, 70); // the owner has 70 credits: the other 37 in dollars
    expect(credits(cancelled, "a")).toBe(0);
    expect(cancelled.bookings[0].cancelled?.fee).toEqual({ credits: 70, usd: 55.5 });
    expect(credits(cancelled, "b")).toBe(105 + 245 + 93);
  });
  it("gives back cover bought for the trip as well", () => {
    const cancelled = cancelBooking(insureTrip(booked, "b", id), "b", id, 0);
    expect(credits(cancelled, "b")).toBe(350);
    expect(cancelled.bookings[0].cancelled?.fee).toEqual({ credits: 0, usd: 160.5 });
  });
  it("frees the car's dates for someone else", () => {
    expect(() => book(booked, "c", "car-a", "2026-12-21", "2026-12-24")).toThrow(/overlap/);
    expect(book(cancelBooking(booked, "b", id), "c", "car-a", "2026-12-21", "2026-12-24").bookings).toHaveLength(2);
  });
  it("is refused for a stranger, for credits the canceller lacks, after pickup, and twice", () => {
    expect(() => cancelBooking(booked, "c", id)).toThrow(/not yours/);
    expect(() => cancelBooking(booked, "a", id)).toThrow(/dollars/);
    expect(() => cancelBooking(savePickup(booked, id, {} as Photos), "b", id)).toThrow(/before pickup/);
    expect(() => cancelBooking(cancelBooking(booked, "b", id), "b", id)).toThrow(/before pickup/);
  });
  it("leaves a cancelled trip with nothing to pick up, insure or return", () => {
    const cancelled = cancelBooking(booked, "b", id);
    expect(() => savePickup(cancelled, id, {} as Photos)).toThrow(/cancelled/);
    expect(() => insureTrip(cancelled, "b", id)).toThrow();
    expect(() => returnCar(cancelled, id)).toThrow(/cancelled/);
  });
});
