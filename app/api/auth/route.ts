// POST { mode: "signup" | "signin", name?, email, password } signs someone in. DELETE signs them out.
import { signIn, signOut, signUp } from "@/lib/server/auth";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  try {
    if (body?.mode === "signup") await signUp(request, body);
    else await signIn(request, body ?? {});
    return Response.json({ ok: true });
  } catch (error) {
    // Every Error thrown by auth.ts is written for the person at the screen.
    const known = error instanceof Error && !(error instanceof TypeError);
    if (!known) console.error("Sign-in failed:", error);
    return Response.json({ error: known ? error.message : "That did not work. Try again." }, { status: known ? 400 : 500 });
  }
}

export async function DELETE() {
  await signOut();
  return Response.json({ ok: true });
}
