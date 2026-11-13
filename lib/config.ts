// Every tunable number in the app lives here.

/**
 * ESTIMATE, NOT VERIFIED. README section 2 puts a rental car at about $300-600 a week;
 * the pitch uses $400 a week, which is about $57 a day. Change it here and nowhere else.
 */
export const RENTAL_COST_PER_DAY_USD_ESTIMATE = 57;

/** Shown next to the impact figure so nobody reads the estimate as a fact. */
export const IMPACT_LABEL = "rental cost avoided (estimate)";

/** What a new account starts with: enough to borrow a car for a first week before lending one. */
export const STARTING_CREDITS = 7;

/** A finding below this confidence is shown as "unsure", never as damage. */
export const MIN_DAMAGE_CONFIDENCE = 0.6;

/** Long edge, in pixels, of any image sent to the inspection API. */
export const MAX_IMAGE_EDGE_PX = 1120;

/**
 * Long edge of a photo as it is stored. The comparison halves each photo anyway (a stitched pair
 * is at most MAX_IMAGE_EDGE_PX wide), so this loses nothing and keeps a trip near 1 MB.
 * shortcut: photos still live in localStorage (about 5 MB). Move them to IndexedDB if trips pile up.
 */
export const STORED_PHOTO_EDGE_PX = 720;

/** Where the map opens before an owner has dropped a pin: the parking garage Google Maps lists
 * for the McNamara terminal (DTW) and for Terminal 1 (YYZ), looked up on 2026-11-13. */
export const AIRPORT_PARKING: Record<string, { lat: number; lng: number }> = {
  DTW: { lat: 42.2068, lng: -83.3555 },
  YYZ: { lat: 43.6831, lng: -79.6135 },
};

export const AIRPORTS: Record<string, string> = {
  DTW: "Detroit Metro",
  YYZ: "Toronto Pearson",
};
