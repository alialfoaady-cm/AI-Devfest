import { describe, expect, it } from "vitest";
import { describeSearch, parseDescribed } from "./describe";

const makes = ["Ford", "Toyota"];

describe("describeSearch", () => {
  it("reads the airport, seats, make and trip length out of a sentence", () => {
    expect(describeSearch("A Toyota with 7 seats in Orlando for five days", makes)).toEqual({ airport: "MCO", seats: 7, make: "Toyota", days: 5 });
    expect(describeSearch("family of 6 landing at lax for a week", makes)).toEqual({ airport: "LAX", seats: 6, make: undefined, days: 7 });
    expect(describeSearch("7-seater at O'Hare for the weekend", makes)).toEqual({ airport: "ORD", seats: 7, make: undefined, days: 3 });
  });

  it("leaves out what the sentence does not say", () => {
    expect(describeSearch("something nice", makes)).toEqual({});
  });
});

describe("parseDescribed", () => {
  it("drops anything a provider made up", () => {
    expect(parseDescribed({ airport: "XXX", seats: 40, make: "Tesla", days: 2.5 }, makes)).toEqual({});
    expect(parseDescribed({ airport: "DTW", seats: 5, make: "Ford", days: 4 }, makes)).toEqual({ airport: "DTW", seats: 5, make: "Ford", days: 4 });
    expect(parseDescribed("not an object", makes)).toEqual({});
  });
});
