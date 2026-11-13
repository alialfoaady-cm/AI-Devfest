// Every tunable number in the app lives here.

/**
 * ESTIMATE, NOT VERIFIED. README section 2 puts a rental car at about $300-600 a week;
 * the pitch uses $400 a week, which is about $57 a day. Change it here and nowhere else.
 */
export const RENTAL_COST_PER_DAY_USD_ESTIMATE = 57;

/** Shown next to the impact figure so nobody reads the estimate as a fact. */
export const IMPACT_LABEL = "rental cost avoided (estimate)";

/**
 * Credits are miles: one credit pays for one mile. A day of a trip includes 35 miles, so a day
 * costs 35 credits, and every mile past a trip's total costs one more.
 * A rate worked out per car (the IBM part) is passed to mileageCharge in lib/rules.ts instead.
 */
export const MILES_INCLUDED_PER_DAY = 35;
export const CREDITS_PER_EXTRA_MILE = 1;
export const CREDITS_PER_DAY = MILES_INCLUDED_PER_DAY * CREDITS_PER_EXTRA_MILE;

/** What a credit costs in money. Any price can be paid in credits, in dollars, or part in each. */
export const USD_PER_CREDIT = 1.5;

/** Cover for a trip: with it Sayara pays for damage the owner confirms, without it the borrower does. */
export const INSURANCE_CREDITS_PER_DAY = 10;

/** A day of airport parking, in dollars. An estimate: real rates differ by airport and by lot. */
export const PARKING_FEE_PER_DAY_USD_ESTIMATE = 20;

/** Sayara's share when a trip is cancelled, on top of the other person's parking fees. */
export const CANCELLATION_CUT = 0.15;

/** The dashboard reading is stored in kilometres. */
export const KM_PER_MILE = 1.609344;

/** What a new account starts with: a first week away, before lending a car. */
export const STARTING_CREDITS = 7 * CREDITS_PER_DAY;

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

/** The airports as dropdown options: the name, tagged with the code. */
export const AIRPORT_OPTIONS = Object.entries(AIRPORTS).map(([code, name]) => ({ value: code, label: name, tag: code }));
