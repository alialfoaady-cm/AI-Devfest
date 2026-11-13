import { describe, expect, it } from "vitest";
import { book } from "../rules";
import { decideFinding, lockerCode, savePickup, saveReturn } from "../inspections";
import { SAMPLE_PICKUP_PHOTOS, SAMPLE_RETURN_PHOTOS, SAMPLE_STATE } from "../sampleData";
import { SLOTS, type InspectionResult, type Slot } from "../types";
import { mockAdapter } from "./mock";
import { parseInspectionResult } from "./validate";
import { kmDriven, slotVerdict } from "./verdict";

const readme = {
  new_damage: [{ location: "rear bumper, left", type: "scratch", severity: "minor", confidence: 0.8 }],
  odometer_km: 48210,
  fuel_level: "1/2",
  notes: "Photo 2 is darker; dirt on door, not damage",
};

describe("validating the model's answer", () => {
  it("accepts the README section 7 shape, as an object or as fenced text", () => {
    expect(parseInspectionResult(readme)?.new_damage[0].type).toBe("scratch");
    expect(parseInspectionResult("```json\n" + JSON.stringify(readme) + "\n```")?.odometer_km).toBe(48210);
  });
  it("rejects anything else", () => {
    for (const bad of [
      null,
      "Sure! The car looks fine.",
      "{ not json",
      {},
      { ...readme, new_damage: "none" },
      { ...readme, new_damage: [{ location: "door", type: "dent", severity: "minor" }] },
      { ...readme, new_damage: [{ ...readme.new_damage[0], confidence: 80 }] },
      { ...readme, odometer_km: "48,210" },
    ]) {
      expect(parseInspectionResult(bad)).toBeNull();
    }
  });
});

describe("what the screen is allowed to say", () => {
  it("shows a failed or unparsed answer as unsure, never damage and never clear", () => {
    expect(slotVerdict(null)).toBe("unsure");
  });
  it("shows low confidence as unsure and high confidence as flagged", () => {
    const low = parseInspectionResult({ ...readme, new_damage: [{ ...readme.new_damage[0], confidence: 0.35 }] });
    expect(slotVerdict(low)).toBe("unsure");
    expect(slotVerdict(parseInspectionResult(readme))).toBe("flagged");
    expect(slotVerdict(parseInspectionResult({ ...readme, new_damage: [] }))).toBe("clear");
  });
  it("only reports kilometres driven when both readings exist", () => {
    expect(kmDriven(parseInspectionResult(readme))).toBeNull();
    expect(kmDriven(parseInspectionResult({ ...readme, odometer_before_km: 48000 }))).toBe(210);
  });
});

describe("mock adapter", () => {
  it("returns a valid result for every slot, with one flagged and one unsure", async () => {
    const verdicts = [];
    for (const slot of SLOTS) {
      const result = parseInspectionResult(await mockAdapter("", slot));
      expect(result).not.toBeNull();
      verdicts.push(slotVerdict(result));
    }
    expect(verdicts.filter((v) => v === "flagged")).toHaveLength(1);
    expect(verdicts.filter((v) => v === "unsure")).toHaveLength(1);
  });
});

describe("photo check and credits", () => {
  const booked = book(SAMPLE_STATE, "user-b", "car-a", "2026-12-20", "2026-12-27");
  const id = booked.bookings[0].id;
  const noResults = Object.fromEntries(SLOTS.map((s) => [s, null])) as Record<Slot, InspectionResult | null>;
  const credits = (state: typeof booked, userId: string) => state.users.find((u) => u.id === userId)!.credits;

  it("will not accept return photos before pickup photos", () => {
    expect(() => saveReturn(booked, id, SAMPLE_RETURN_PHOTOS, noResults, "mock")).toThrow(/pickup/);
  });
  it("pays the owner on return, and the owner's decision moves no credits", () => {
    const returned = saveReturn(savePickup(booked, id, SAMPLE_PICKUP_PHOTOS), id, SAMPLE_RETURN_PHOTOS, noResults, "mock");
    expect(credits(returned, "user-a")).toBe(70 + 245);
    const decided = decideFinding(returned, `${id}-return`, "back:0", "confirmed");
    expect(decided.inspections[1].ownerDecision).toEqual({ "back:0": "confirmed" });
    expect(decided.users).toEqual(returned.users);
  });
  it("gives a 4-digit locker code", () => {
    expect(lockerCode(id)).toMatch(/^\d{4}$/);
  });
});
