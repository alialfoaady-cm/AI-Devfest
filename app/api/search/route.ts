// AI search. POST { text } -> { filters, provider }. Open to visitors: it reads only what a visitor can already see.
// Like app/api/inspect/route.ts, this is server code so that IBM credentials never reach the browser.
import { makeOf } from "@/lib/cars";
import { describeSearch, parseDescribed } from "@/lib/search/describe";
import { watsonxSearch } from "@/lib/search/watsonx";
import { readDb } from "@/lib/server/db";

const MAX_TEXT_CHARS = 200;

function provider(): "mock" | "watsonx" {
  return process.env.SEARCH_PROVIDER === "watsonx" ? "watsonx" : "mock";
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const text = typeof body?.text === "string" ? body.text.trim().slice(0, MAX_TEXT_CHARS) : "";
  if (!text) return Response.json({ error: "Describe the car or the trip you want." }, { status: 400 });

  const makes = [...new Set((await readDb()).state.cars.map((car) => makeOf(car.model)))];
  if (provider() === "watsonx") {
    try {
      return Response.json({ filters: parseDescribed(await watsonxSearch(text, makes), makes), provider: "watsonx" });
    } catch (error) {
      // A live demo must not stall on the network: say so in the log and answer with the word matcher.
      console.error("watsonx search failed, using the word matcher:", error);
    }
  }
  return Response.json({ filters: parseDescribed(describeSearch(text, makes), makes), provider: "mock" });
}
