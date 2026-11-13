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
  /** Where the owner left it, dropped on the map. */
  pin?: Pin;
  /** A picture of the car for its listing: a data URL from the camera, or a path under /public. */
  photo?: string;
  /** The painted bay number, as the owner typed it. */
  spot?: string;
};

export type Pin = { lat: number; lng: number };

export type Booking = {
  id: string;
  carId: string;
  userId: string;
  from: string;
  to: string;
  days: number;
  status: "booked" | "returned" | "cancelled";
  /** Set on return, when both odometer readings could be read. */
  mileage?: MileageCharge;
  /** How the trip was paid for. */
  paid?: Payment;
  /** Set when the borrower bought cover: Sayara pays for damage the owner confirms. */
  insurance?: Payment;
  /** Set when the trip was cancelled before pickup. */
  cancelled?: { by: string; fee: Payment; parkingCredits: number; refund: Payment };
};

/** A price paid part in credits and part in dollars (either part can be zero). */
export type Payment = { credits: number; usd: number };

/** Miles driven against the miles a trip includes, and what the extra ones cost in credits. */
export type MileageCharge = { miles: number; included: number; extraMiles: number; credits: number };

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
  /** Which adapter produced aiResult: "mock" or "watsonx". Shown on the report. */
  aiProvider?: string;
  /** Keyed "slot:index" of a finding in aiResult[slot].new_damage. */
  ownerDecision: Record<string, OwnerDecision>;
};

/** One chat message on a trip, between its borrower and the car's owner. `at` is an ISO time set by the server. */
export type Message = { id: string; bookingId: string; from: string; text: string; at: string };

export type State = {
  users: User[];
  cars: Car[];
  bookings: Booking[];
  inspections: Inspection[];
  /** Optional so data files written before chat existed still load. */
  messages?: Message[];
};
