// Canned answers so the whole demo runs with no credentials. It never looks at the image.
// The findings match the drawn sample photos in public/samples (scripts/make-samples.mjs).
import type { Slot } from "../types";
import type { InspectionAdapter } from "./adapter";

const clear = { new_damage: [], odometer_km: null, fuel_level: null, notes: "No visible change between the two photos." };

const CANNED: Record<Slot, unknown> = {
  front: clear,
  back: {
    new_damage: [{ location: "rear bumper, left", type: "scratch", severity: "minor", confidence: 0.86 }],
    odometer_km: null,
    fuel_level: null,
    notes: "Two light marks on the return photo that are not on the pickup photo.",
  },
  // The low-confidence case: must show as "unsure", not as damage.
  left: {
    new_damage: [{ location: "left rear door", type: "dent", severity: "minor", confidence: 0.35 }],
    odometer_km: null,
    fuel_level: null,
    notes: "The return photo is much darker than the pickup photo. The mark may be a shadow.",
  },
  right: clear,
  interior: clear,
  dashboard: {
    new_damage: [],
    odometer_before_km: 48210,
    odometer_km: 48682,
    fuel_level: "1/2",
    notes: "Odometer read from both photos. Fuel was at 3/4 at pickup.",
  },
};

export const mockAdapter: InspectionAdapter = async (_stitchedImage, slot) => {
  await new Promise((resolve) => setTimeout(resolve, 450)); // long enough to see the progress state
  return CANNED[slot];
};
