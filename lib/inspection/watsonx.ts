// IBM watsonx.ai adapter: sends the stitched pickup/return pair to a vision model and returns its raw text.
// Server-side only. The API key is read from the environment here and never leaves the server.
// The route validates the answer (validate.ts); this file does not trust or reshape it.
import type { Slot } from "../types";
import type { InspectionAdapter } from "./adapter";

/** Vision models on watsonx.ai that take an image in chat (us-south, eu-de). Override with WATSONX_MODEL_ID. */
export const DEFAULT_MODEL_ID = "meta-llama/llama-4-maverick-17b-128e-instruct-fp8";
const API_VERSION = "2024-10-08";
const IAM_URL = "https://iam.cloud.ibm.com/identity/token";
const TIMEOUT_MS = 45_000;

export type WatsonxConfig = { apiKey: string; url: string; projectId: string; modelId: string };

/** Reads the four WATSONX_ variables. Throws a clear message naming what is missing. */
export function watsonxConfig(env: Record<string, string | undefined> = process.env): WatsonxConfig {
  const apiKey = env.WATSONX_API_KEY?.trim() ?? "";
  const url = (env.WATSONX_URL?.trim() || "https://us-south.ml.cloud.ibm.com").replace(/\/+$/, "");
  const projectId = env.WATSONX_PROJECT_ID?.trim() ?? "";
  const modelId = env.WATSONX_MODEL_ID?.trim() || DEFAULT_MODEL_ID;
  const missing = [!apiKey && "WATSONX_API_KEY", !projectId && "WATSONX_PROJECT_ID"].filter(Boolean);
  if (missing.length) throw new Error(`Set ${missing.join(" and ")} in .env.local to use INSPECTION_PROVIDER=watsonx.`);
  return { apiKey, url, projectId, modelId };
}

const SLOT_FOCUS: Record<Slot, string> = {
  front: "the front of the car: bumper, grille, headlights, bonnet, windscreen",
  back: "the back of the car: bumper, boot, tail lights, rear window",
  left: "the left side of the car: doors, wings, mirror, wheels, sills",
  right: "the right side of the car: doors, wings, mirror, wheels, sills",
  interior: "the inside of the car: seats, dashboard trim, door cards, carpets (stains, tears, burns)",
  dashboard:
    "the instrument cluster. Read the odometer on BOTH photos (odometer_before_km from the left, odometer_km from the right; convert miles to km if the unit says mi) and the fuel gauge on the right photo as a fraction like \"1/2\"",
};

/** The instructions sent with the image. Exported for tests and for tuning. */
export function inspectionPrompt(slot: Slot): string {
  return [
    "You inspect rental cars for damage. The image holds two photos side by side of the same car from the same angle.",
    "LEFT half = photo taken at PICKUP. RIGHT half = photo taken at RETURN.",
    `This pair shows ${SLOT_FOCUS[slot]}.`,
    "Report only damage that is visible on the RIGHT (return) photo and NOT on the LEFT (pickup) photo.",
    "Ignore differences in lighting, shadows, reflections, dirt, water, angle and zoom. Those are not damage.",
    "If the photos are too dark, blurry or different to compare, report no damage and say so in notes.",
    "confidence is your certainty from 0 to 1. Use below 0.6 when unsure.",
    "Answer with ONLY this JSON, no other text:",
    '{"new_damage":[{"location":"rear bumper, left","type":"scratch|dent|crack|chip|stain|tear|missing part","severity":"minor|moderate|major","confidence":0.8}],"odometer_before_km":null,"odometer_km":null,"fuel_level":null,"notes":"one short sentence"}',
    slot === "dashboard"
      ? "For this dashboard pair fill odometer_before_km, odometer_km (numbers) and fuel_level when readable, else null."
      : "For this pair leave odometer_before_km, odometer_km and fuel_level as null.",
  ].join("\n");
}

// IAM tokens last an hour; keep one per API key and refresh a minute early.
let cachedToken: { key: string; token: string; expiresAt: number } | null = null;

/** Only for tests. */
export function clearTokenCache() {
  cachedToken = null;
}

async function iamToken(apiKey: string, fetcher: typeof fetch): Promise<string> {
  if (cachedToken && cachedToken.key === apiKey && cachedToken.expiresAt > Date.now() + 60_000) return cachedToken.token;
  const response = await fetcher(IAM_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json" },
    body: new URLSearchParams({ grant_type: "urn:ibm:params:oauth:grant-type:apikey", apikey: apiKey }),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!response.ok) throw new Error(`IBM IAM token request failed (${response.status}). Check WATSONX_API_KEY.`);
  const body = (await response.json()) as { access_token?: string; expires_in?: number };
  if (!body.access_token) throw new Error("IBM IAM answered without an access token.");
  cachedToken = { key: apiKey, token: body.access_token, expiresAt: Date.now() + (body.expires_in ?? 3600) * 1000 };
  return body.access_token;
}

/** Builds the adapter. `fetcher` and `env` are injectable so tests never call IBM. */
export function createWatsonxAdapter(
  options: { fetcher?: typeof fetch; env?: Record<string, string | undefined> } = {},
): InspectionAdapter {
  const fetcher = options.fetcher ?? fetch;
  return async (stitchedImage, slot) => {
    const config = watsonxConfig(options.env);
    const token = await iamToken(config.apiKey, fetcher);
    const response = await fetcher(`${config.url}/ml/v1/text/chat?version=${API_VERSION}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({
        model_id: config.modelId,
        project_id: config.projectId,
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: inspectionPrompt(slot) },
              { type: "image_url", image_url: { url: stitchedImage } },
            ],
          },
        ],
        temperature: 0,
        max_tokens: 600,
      }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!response.ok) {
      const detail = (await response.text().catch(() => "")).slice(0, 300);
      throw new Error(`watsonx chat failed (${response.status}) for model ${config.modelId}: ${detail}`);
    }
    const body = (await response.json()) as { choices?: { message?: { content?: unknown } }[] };
    // Raw text; parseInspectionResult in the route pulls the JSON out of it or returns null.
    return body.choices?.[0]?.message?.content ?? null;
  };
}

export const watsonxAdapter: InspectionAdapter = createWatsonxAdapter();
