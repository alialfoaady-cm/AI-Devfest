// The model's answer is untrusted text. Nothing reaches the screen unless it passes here.
import type { Damage, InspectionResult } from "../types";

const isText = (value: unknown): value is string => typeof value === "string";
const isNumber = (value: unknown): value is number => typeof value === "number" && Number.isFinite(value);

function parseDamage(raw: unknown): Damage | null {
  if (typeof raw !== "object" || raw === null) return null;
  const { location, type, severity, confidence } = raw as Record<string, unknown>;
  if (!isText(location) || !isText(type) || !isText(severity)) return null;
  if (!isNumber(confidence) || confidence < 0 || confidence > 1) return null;
  return { location, type, severity, confidence };
}

/**
 * Accepts the model's reply as text (with or without a ```json fence) or as an object.
 * Returns null if anything is off. The UI shows null as "unsure", never as damage and never as clear.
 */
export function parseInspectionResult(raw: unknown): InspectionResult | null {
  let value = raw;
  if (isText(value)) {
    const start = value.indexOf("{");
    const end = value.lastIndexOf("}");
    if (start < 0 || end <= start) return null;
    try {
      value = JSON.parse(value.slice(start, end + 1));
    } catch {
      return null;
    }
  }
  if (typeof value !== "object" || value === null) return null;

  const { new_damage, odometer_km, odometer_before_km, fuel_level, notes } = value as Record<string, unknown>;
  if (!Array.isArray(new_damage)) return null;
  const damage = new_damage.map(parseDamage);
  if (damage.includes(null)) return null;

  const optional = <T>(field: unknown, ok: (v: unknown) => v is T): T | null | undefined =>
    field === undefined || field === null ? null : ok(field) ? field : undefined;
  const km = optional(odometer_km, isNumber);
  const kmBefore = optional(odometer_before_km, isNumber);
  const fuel = optional(fuel_level, isText);
  if (km === undefined || kmBefore === undefined || fuel === undefined) return null;

  return {
    new_damage: damage as Damage[],
    odometer_km: km,
    odometer_before_km: kmBefore,
    fuel_level: fuel,
    notes: isText(notes) ? notes : "",
  };
}
