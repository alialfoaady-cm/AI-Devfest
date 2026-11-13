// Pure state changes for the photo check. Booking rules stay in lib/rules.ts.
import { kmDriven } from "./inspection/verdict";
import { returnCar } from "./rules";
import type { Inspection, InspectionResult, OwnerDecision, Photos, Slot, State } from "./types";

export function findInspection(state: State, bookingId: string, phase: Inspection["phase"]) {
  return state.inspections.find((i) => i.bookingId === bookingId && i.phase === phase);
}

export function savePickup(state: State, bookingId: string, photos: Photos): State {
  if (findInspection(state, bookingId, "pickup")) throw new Error("Pickup photos are already saved.");
  if (state.bookings.find((b) => b.id === bookingId)?.status === "cancelled") throw new Error("This trip was cancelled.");
  return {
    ...state,
    inspections: [
      ...state.inspections,
      { id: `${bookingId}-pickup`, bookingId, phase: "pickup", photos, aiResult: null, ownerDecision: {} },
    ],
  };
}

/**
 * Saves the return photos with the AI's flags, then returns the car, which pays the owner:
 * the days, plus any miles past the allowance, measured from the two dashboard readings.
 */
export function saveReturn(
  state: State,
  bookingId: string,
  photos: Photos,
  aiResult: Record<Slot, InspectionResult | null>,
  aiProvider: string,
): State {
  if (!findInspection(state, bookingId, "pickup")) throw new Error("Take the pickup photos first.");
  const returned = returnCar(state, bookingId, kmDriven(aiResult.dashboard));
  return {
    ...returned,
    inspections: [
      ...returned.inspections,
      { id: `${bookingId}-return`, bookingId, phase: "return", photos, aiResult, aiProvider, ownerDecision: {} },
    ],
  };
}

/** The owner's call on one finding. It is recorded and nothing else: no credits move. */
export function decideFinding(
  state: State,
  inspectionId: string,
  findingKey: string,
  decision: OwnerDecision,
): State {
  return {
    ...state,
    inspections: state.inspections.map((i) =>
      i.id === inspectionId ? { ...i, ownerDecision: { ...i.ownerDecision, [findingKey]: decision } } : i,
    ),
  };
}

/** A made-up 4-digit code derived from the booking id. There is no real locker. */
export function lockerCode(bookingId: string): string {
  let hash = 7;
  for (const char of bookingId) hash = (hash * 31 + char.charCodeAt(0)) % 10000;
  return String(hash).padStart(4, "0");
}

/** Where a booking is in the demo flow, which decides the next thing its borrower does. */
export function tripStage(state: State, bookingId: string): "pickup" | "driving" | "returned" | "cancelled" {
  const status = state.bookings.find((b) => b.id === bookingId)?.status;
  if (status === "returned" || status === "cancelled") return status;
  return findInspection(state, bookingId, "pickup") ? "driving" : "pickup";
}
