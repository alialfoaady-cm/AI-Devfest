import type { Slot } from "../types";

/**
 * What every server-side inspection provider implements (mock.ts, watsonx.ts).
 *
 * It receives ONE image: the pickup and return photos stitched side by side in the browser
 * (see stitch.ts), pickup on the left, return on the right. It returns the model's raw answer.
 * The API route validates that answer; an adapter must not be trusted to.
 */
export type InspectionAdapter = (stitchedImage: string, slot: Slot) => Promise<unknown>;
