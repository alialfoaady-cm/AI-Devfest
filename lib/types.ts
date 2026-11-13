// Data model from README section 8. Dates are "YYYY-MM-DD" strings, which compare correctly as text.

export const SLOTS = ["front", "back", "left", "right", "interior", "dashboard"] as const;
export type Slot = (typeof SLOTS)[number];

export const SLOT_LABELS: Record<Slot, string> = {
  front: "Front",
  back: "Back",
  left: "Left side",
  right: "Right side",
  interior: "Interior",
  dashboard: "Dashboard",
};

export type User = { id: string; name: string; credits: number };

/** from/to = the owner's away window. `to` is the day the owner lands: a hard cutoff. */
export type Car = {
  id: string;
  ownerId: string;
  airport: string;
  model: string;
  seats: number;
  from: string;
  to: string;
};

export type Booking = {
  id: string;
  carId: string;
  userId: string;
  from: string;
  to: string;
  days: number;
  status: "booked" | "returned";
};

/** One finding from the model. It is a flag for a person to review, never a verdict. */
export type Damage = {
  location: string;
  type: string;
  severity: string;
  confidence: number;
};

/**
 * README section 7 shape, plus `odometer_before_km`: the stitched image shows both
 * dashboards, and kilometres driven needs both readings.
 */
export type InspectionResult = {
  new_damage: Damage[];
  odometer_km: number | null;
  odometer_before_km: number | null;
  fuel_level: string | null;
  notes: string;
};

export type Photos = Record<Slot, string>;
export type OwnerDecision = "confirmed" | "disputed";

export type Inspection = {
  id: string;
  bookingId: string;
  phase: "pickup" | "return";
  photos: Photos;
  /** Return phase only. null for a slot = the model's answer could not be trusted: show "unsure". */
  aiResult: Record<Slot, InspectionResult | null> | null;
  /** Keyed "slot:index" of a finding in aiResult[slot].new_damage. */
  ownerDecision: Record<string, OwnerDecision>;
};

export type State = {
  users: User[];
  cars: Car[];
  bookings: Booking[];
  inspections: Inspection[];
};
