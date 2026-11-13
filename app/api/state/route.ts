// GET -> { me, state }: who is signed in, and the data they may see. Signed out, me is null and
// the state is the public part: enough to browse cars.
import { viewFor } from "@/lib/server/actions";
import { currentUserId } from "@/lib/server/auth";
import { readDb } from "@/lib/server/db";

export async function GET() {
  const me = await currentUserId();
  return Response.json({ me, state: viewFor((await readDb()).state, me ?? "") });
}
