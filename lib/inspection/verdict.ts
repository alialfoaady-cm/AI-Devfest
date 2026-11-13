// Turns a validated result into what the screen says. The words here are flags for a person:
// "flagged" means "an owner should look", not "the borrower did it".
import { MIN_DAMAGE_CONFIDENCE } from "../config";
import type { Damage, InspectionResult } from "../types";

export type Verdict = "clear" | "flagged" | "unsure";

export function findingVerdict(damage: Damage): Exclude<Verdict, "clear"> {
  return damage.confidence >= MIN_DAMAGE_CONFIDENCE ? "flagged" : "unsure";
}

/** null = the answer failed validation or the request failed: unsure, never clear, never damage. */
export function slotVerdict(result: InspectionResult | null): Verdict {
  if (!result) return "unsure";
  if (result.new_damage.length === 0) return "clear";
  return result.new_damage.some((d) => findingVerdict(d) === "flagged") ? "flagged" : "unsure";
}

/** Kilometres driven, only when both readings exist and make sense. */
export function kmDriven(result: InspectionResult | null): number | null {
  if (!result || result.odometer_km === null || result.odometer_before_km === null) return null;
  const driven = result.odometer_km - result.odometer_before_km;
  return driven >= 0 ? driven : null;
}
