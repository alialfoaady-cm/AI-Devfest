// POST { type, ...payload } -> { state }. The one way to change anything. See lib/server/actions.ts
// for the list of actions and what each one checks.
import { applyAction, viewFor } from "@/lib/server/actions";
import { currentUserId } from "@/lib/server/auth";
import { transact } from "@/lib/server/db";

export async function POST(request: Request) {
  const me = await currentUserId();
  if (!me) return Response.json({ error: "Sign in first." }, { status: 401 });

  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) return Response.json({ error: "That did not work. Try again." }, { status: 400 });

  try {
    const state = await transact(async (db) => {
      const next = await applyAction(db.state, me, body.type, body);
      return { db: { ...db, state: next }, result: next };
    });
    return Response.json({ state: viewFor(state, me) });
  } catch (error) {
    // The rules and the checks throw plain Errors written for the person at the screen.
    // Anything else (a TypeError from odd input, a disk failure) gets a plain answer and a log line.
    const known = error instanceof Error && error.constructor === Error;
    if (!known) console.error("Action failed:", error);
    return Response.json({ error: known ? error.message : "That did not work. Try again." }, { status: known ? 400 : 500 });
  }
}
