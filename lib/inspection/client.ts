// What the UI calls. It packs the pair, asks the server, and trusts nothing it gets back.
import type { InspectionResult, Slot } from "../types";
import { stitchPair } from "./stitch";
import { parseInspectionResult } from "./validate";

/**
 * Compares one pickup photo with one return photo.
 * Returns null when the request fails or the answer does not validate; the UI shows that as "unsure".
 */
export async function compareInspection(
  before: string,
  after: string,
  slot: Slot,
): Promise<InspectionResult | null> {
  try {
    const image = await stitchPair(before, after);
    const response = await fetch("/api/inspect", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slot, image }),
    });
    const body = await response.json();
    if (!response.ok) console.warn(`Inspection of "${slot}" failed:`, body.error);
    return response.ok ? parseInspectionResult(body.result) : null;
  } catch (error) {
    console.warn(`Inspection of "${slot}" failed:`, error);
    return null;
  }
}

/** "mock" or "watsonx", so the report can say who did the checking. */
export async function inspectionProvider(): Promise<string> {
  try {
    return (await (await fetch("/api/inspect")).json()).provider;
  } catch {
    return "unknown";
  }
}
