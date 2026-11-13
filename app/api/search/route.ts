// AI search. POST { text } -> { filters, provider }. Open to visitors: it reads only what a visitor can already see.
// Like app/api/inspect/route.ts, this is server code so that IBM credentials never reach the browser.
import { makeOf } from "@/lib/cars";
import { describeSearch, parseDescribed } from "@/lib/search/describe";
import { readDb } from "@/lib/server/db";

const MAX_TEXT_CHARS = 200;

function provider(): "mock" | "watsonx" {
  return process.env.SEARCH_PROVIDER === "watsonx" ? "watsonx" : "mock";
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const text = typeof body?.text === "string" ? body.text.trim().slice(0, MAX_TEXT_CHARS) : "";
  if (!text) return Response.json({ error: "Describe the car or the trip you want." }, { status: 400 });

  const name = provider();
  if (name === "watsonx") {
    // The watsonx adapter (lib/search/watsonx.ts) is the next piece of work. It gets the text and the makes, and returns a Described.
    return Response.json({ error: "The watsonx search adapter is not built yet. Use SEARCH_PROVIDER=mock." }, { status: 501 });
  }

  const makes = [...new Set((await readDb()).state.cars.map((car) => makeOf(car.model)))];
  return Response.json({ filters: parseDescribed(describeSearch(text, makes), makes), provider: name });
}
