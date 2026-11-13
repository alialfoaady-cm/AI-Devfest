// GET -> { me, state }: who is signed in, and the data they may see. { me: null } when signed out.
import { viewFor } from "@/lib/server/actions";
import { currentUserId } from "@/lib/server/auth";
import { readDb } from "@/lib/server/db";

export async function GET() {
  const me = await currentUserId();
  if (!me) return Response.json({ me: null });
  return Response.json({ me, state: viewFor((await readDb()).state, me) });
}
