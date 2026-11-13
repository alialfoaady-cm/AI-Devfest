// IBM watsonx.ai, server only. Every call to IBM goes through chat(), so the API key never leaves the server.
// Request shapes were confirmed by live calls on 2026-11-13 (us-south): an IAM token from the API key,
// then POST /ml/v1/text/chat. Image models take a content part { type: "image_url", image_url: { url: dataUrl } }.

const IAM_URL = "https://iam.cloud.ibm.com/identity/token";
const API_VERSION = "2024-05-01";

type Message = { role: "system" | "user" | "assistant"; content: string | object[] };

/** IBM tokens last an hour; reuse one until five minutes before it runs out. */
let token: { value: string; until: number } | null = null;

async function accessToken(apiKey: string): Promise<string> {
  if (token && Date.now() < token.until) return token.value;
  const response = await fetch(IAM_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json" },
    body: new URLSearchParams({ grant_type: "urn:ibm:params:oauth:grant-type:apikey", apikey: apiKey }),
  });
  if (!response.ok) throw new Error(`IBM sign-in failed (HTTP ${response.status}). Check WATSONX_API_KEY.`);
  const answer = (await response.json()) as { access_token: string; expires_in: number };
  token = { value: answer.access_token, until: Date.now() + (answer.expires_in - 300) * 1000 };
  return token.value;
}

/** One chat call. Returns the model's reply text. Throws on a missing setting or a failed call. */
export async function chat(model: string, messages: Message[], options: { json?: boolean; maxTokens?: number } = {}): Promise<string> {
  const { WATSONX_API_KEY: key, WATSONX_URL: url, WATSONX_PROJECT_ID: project } = process.env;
  if (!key || !url || !project) throw new Error("Set WATSONX_API_KEY, WATSONX_URL and WATSONX_PROJECT_ID in .env.local.");

  const response = await fetch(`${url}/ml/v1/text/chat?version=${API_VERSION}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${await accessToken(key)}`, "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({
      model_id: model,
      project_id: project,
      messages,
      temperature: 0,
      max_completion_tokens: options.maxTokens ?? 300,
      ...(options.json ? { response_format: { type: "json_object" } } : {}),
    }),
    signal: AbortSignal.timeout(20_000),
  });
  if (!response.ok) throw new Error(`watsonx answered HTTP ${response.status}: ${(await response.text()).slice(0, 200)}`);
  const answer = (await response.json()) as { choices?: { message?: { content?: string } }[] };
  return answer.choices?.[0]?.message?.content ?? "";
}

/** The JSON object in a model's reply, which may come wrapped in prose or a ```json fence. Null if there is none. */
export function jsonIn(reply: string): unknown {
  const start = reply.indexOf("{");
  const end = reply.lastIndexOf("}");
  if (start < 0 || end <= start) return null;
  try {
    return JSON.parse(reply.slice(start, end + 1));
  } catch {
    return null;
  }
}
