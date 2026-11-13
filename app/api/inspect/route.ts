// The only server code in the app, and the only place IBM credentials may be read.
// POST { slot, image } -> { result, provider }. `image` is the stitched pair as a data URL.
import type { InspectionAdapter } from "@/lib/inspection/adapter";
import { mockAdapter } from "@/lib/inspection/mock";
import { parseInspectionResult } from "@/lib/inspection/validate";
import { SLOTS, type Slot } from "@/lib/types";

const MAX_IMAGE_CHARS = 4_000_000; // about 3 MB of JPEG; a stitched 1120 px pair is far smaller

function provider(): "mock" | "watsonx" {
  return process.env.INSPECTION_PROVIDER === "watsonx" ? "watsonx" : "mock";
}

export async function GET() {
  return Response.json({ provider: provider() });
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const slot = body?.slot as Slot;
  const image = body?.image;
  if (!SLOTS.includes(slot) || typeof image !== "string" || !image.startsWith("data:image/")) {
    return Response.json({ error: "Send { slot, image } with image as a data URL." }, { status: 400 });
  }
  if (image.length > MAX_IMAGE_CHARS) {
    return Response.json({ error: "Image is too large. Resize it before upload." }, { status: 413 });
  }

  const name = provider();
  if (name === "watsonx") {
    // The watsonx adapter (lib/inspection/watsonx.ts) is the next piece of work.
    return Response.json({ error: "The watsonx adapter is not built yet. Use INSPECTION_PROVIDER=mock." }, { status: 501 });
  }
  const adapter: InspectionAdapter = mockAdapter;

  try {
    // result is null when the answer does not validate. The client shows null as "unsure".
    return Response.json({ result: parseInspectionResult(await adapter(image, slot)), provider: name });
  } catch (error) {
    console.error("Inspection adapter failed:", error);
    return Response.json({ error: "The inspection service did not answer." }, { status: 502 });
  }
}
