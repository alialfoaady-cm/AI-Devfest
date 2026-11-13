import { beforeEach, describe, expect, it } from "vitest";
import { parseInspectionResult } from "./validate";
import { clearTokenCache, createWatsonxAdapter, DEFAULT_MODEL_ID, inspectionPrompt, watsonxConfig } from "./watsonx";

const env = { WATSONX_API_KEY: "test-key", WATSONX_PROJECT_ID: "project-1", WATSONX_URL: "https://eu-de.ml.cloud.ibm.com/" };
const image = "data:image/jpeg;base64,AAAA";
const answer = '```json\n{"new_damage":[{"location":"rear bumper, left","type":"scratch","severity":"minor","confidence":0.82}],"odometer_before_km":null,"odometer_km":null,"fuel_level":null,"notes":"New scratch."}\n```';

/** A fake IBM: IAM hands out a token, the chat endpoint returns `reply`. Records every call. */
function fakeIbm(reply: { status?: number; content?: unknown } = {}) {
  const calls: { url: string; init: RequestInit }[] = [];
  const fetcher = (async (input: string | URL | Request, init: RequestInit = {}) => {
    const url = String(input);
    calls.push({ url, init });
    if (url.includes("iam.cloud.ibm.com")) return Response.json({ access_token: "token-1", expires_in: 3600 });
    if (reply.status && reply.status >= 400) return new Response("model not found", { status: reply.status });
    return Response.json({ choices: [{ message: { content: reply.content ?? answer } }] });
  }) as typeof fetch;
  return { fetcher, calls };
}

beforeEach(() => clearTokenCache());

describe("watsonx adapter", () => {
  it("reads the settings, with the default region and model", () => {
    expect(watsonxConfig({ WATSONX_API_KEY: "k", WATSONX_PROJECT_ID: "p" })).toEqual({
      apiKey: "k",
      projectId: "p",
      url: "https://us-south.ml.cloud.ibm.com",
      modelId: DEFAULT_MODEL_ID,
    });
  });

  it("names the missing settings", () => {
    expect(() => watsonxConfig({})).toThrow(/WATSONX_API_KEY and WATSONX_PROJECT_ID/);
    expect(() => watsonxConfig({ WATSONX_API_KEY: "k" })).toThrow(/WATSONX_PROJECT_ID/);
  });

  it("gets a token, then sends the prompt and the stitched image to the chat API", async () => {
    const ibm = fakeIbm();
    const raw = await createWatsonxAdapter({ fetcher: ibm.fetcher, env })(image, "back");

    expect(ibm.calls[0].url).toBe("https://iam.cloud.ibm.com/identity/token");
    expect(String(ibm.calls[0].init.body)).toContain("apikey=test-key");

    const chat = ibm.calls[1];
    expect(chat.url).toBe("https://eu-de.ml.cloud.ibm.com/ml/v1/text/chat?version=2024-10-08");
    expect((chat.init.headers as Record<string, string>).Authorization).toBe("Bearer token-1");
    const body = JSON.parse(String(chat.init.body));
    expect(body.model_id).toBe(DEFAULT_MODEL_ID);
    expect(body.project_id).toBe("project-1");
    expect(body.temperature).toBe(0);
    expect(body.messages[0].content[0].text).toBe(inspectionPrompt("back"));
    expect(body.messages[0].content[1]).toEqual({ type: "image_url", image_url: { url: image } });

    // The route's validator turns the raw reply into the README shape.
    expect(parseInspectionResult(raw)?.new_damage[0]).toMatchObject({ type: "scratch", confidence: 0.82 });
  });

  it("reuses the IAM token for the next photo", async () => {
    const ibm = fakeIbm();
    const adapter = createWatsonxAdapter({ fetcher: ibm.fetcher, env });
    await adapter(image, "front");
    await adapter(image, "left");
    expect(ibm.calls.filter((c) => c.url.includes("iam.cloud.ibm.com"))).toHaveLength(1);
  });

  it("throws on an IBM error, so the route answers 502", async () => {
    const ibm = fakeIbm({ status: 404 });
    await expect(createWatsonxAdapter({ fetcher: ibm.fetcher, env })(image, "front")).rejects.toThrow(/404/);
  });

  it("passes a chatty answer through, and the validator turns it into null (unsure)", async () => {
    const ibm = fakeIbm({ content: "The car looks fine to me!" });
    const raw = await createWatsonxAdapter({ fetcher: ibm.fetcher, env })(image, "front");
    expect(parseInspectionResult(raw)).toBeNull();
  });

  it("asks for odometer readings only on the dashboard pair", () => {
    expect(inspectionPrompt("dashboard")).toMatch(/odometer_before_km from the left/);
    expect(inspectionPrompt("front")).toMatch(/leave odometer_before_km, odometer_km and fuel_level as null/);
    expect(inspectionPrompt("front")).toMatch(/LEFT half = photo taken at PICKUP/);
  });
});
