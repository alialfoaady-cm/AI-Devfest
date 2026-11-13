// Every tunable number in the app lives here.

/**
 * ESTIMATE, NOT VERIFIED. README section 2 puts a rental car at about $300-600 a week;
 * the pitch uses $400 a week, which is about $57 a day. Change it here and nowhere else.
 */
export const RENTAL_COST_PER_DAY_USD_ESTIMATE = 57;

/** Shown next to the impact figure so nobody reads the estimate as a fact. */
export const IMPACT_LABEL = "rental cost avoided (estimate)";

/** A finding below this confidence is shown as "unsure", never as damage. */
export const MIN_DAMAGE_CONFIDENCE = 0.6;

/** Long edge, in pixels, of any image sent to the inspection API. */
export const MAX_IMAGE_EDGE_PX = 1120;

export const AIRPORTS: Record<string, string> = {
  DTW: "Detroit Metro",
  YYZ: "Toronto Pearson",
};
