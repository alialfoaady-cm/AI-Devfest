// AI search on IBM watsonx.ai. Server only (it is imported by app/api/search/route.ts).
// The model only reads the sentence: the app's own data still decides which cars exist and when.
import { AIRPORTS } from "../config";
import { chat, jsonIn } from "../server/watsonx";
import type { SearchAdapter } from "./describe";

/**
 * IBM Granite: in a live test on 2026-11-13 it read 4 of 4 trip sentences right in 0.6 s on average,
 * the fastest of the 7 chat models in us-south. Llama 3.3 70B and Mistral Small 3.1 also scored 4/4.
 */
export const SEARCH_MODEL = "ibm/granite-4-h-small";

export const watsonxSearch: SearchAdapter = async (text, makes) => {
  const system =
    "You turn a traveller's sentence into search filters for a car-sharing app. Reply with JSON only: " +
    '{"airport": code or null, "seats": whole number or null, "make": make or null, "days": whole number or null}. ' +
    `airport must be one of these codes: ${JSON.stringify(AIRPORTS)}. make must be one of: ${JSON.stringify(makes)}. ` +
    "seats is how many people need a seat. days is the trip length in days (a week is 7, a weekend is 3). " +
    "Use null for anything the sentence does not say. Never invent a value.";
  return jsonIn(await chat(SEARCH_MODEL, [{ role: "system", content: system }, { role: "user", content: text }], { json: true, maxTokens: 120 }));
};
