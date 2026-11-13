import { afterEach, describe, expect, it, vi } from "vitest";
import { parseDescribed } from "./describe";
import { SEARCH_MODEL, watsonxSearch } from "./watsonx";

describe("watsonx search", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("signs in, asks the search model for JSON, and reads the filters out of its reply", async () => {
    vi.stubEnv("WATSONX_API_KEY", "test-key");
    vi.stubEnv("WATSONX_URL", "https://example.test");
    vi.stubEnv("WATSONX_PROJECT_ID", "project-1");
    const calls: { url: string; body: string }[] = [];
    vi.stubGlobal("fetch", async (url: string, init: RequestInit) => {
      calls.push({ url, body: String(init.body) });
      if (url.includes("iam.cloud.ibm.com")) return Response.json({ access_token: "t", expires_in: 3600 });
      return Response.json({ choices: [{ message: { content: '```json\n{"airport": "DEN", "seats": 5, "make": null, "days": 7}\n```' } }] });
    });

    const raw = await watsonxSearch("ski week in Denver, family of 5", ["Ford", "Subaru"]);

    expect(parseDescribed(raw, ["Ford", "Subaru"])).toEqual({ airport: "DEN", seats: 5, make: undefined, days: 7 });
    const chatCall = JSON.parse(calls.find((c) => c.url.includes("/ml/v1/text/chat"))!.body);
    expect(chatCall).toMatchObject({ model_id: SEARCH_MODEL, project_id: "project-1", response_format: { type: "json_object" } });
  });
});
