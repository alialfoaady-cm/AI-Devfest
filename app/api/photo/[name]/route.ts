// GET /api/photo/<name> -> the stored image. Signed-in users only; names are long random strings.
import { currentUserId } from "@/lib/server/auth";
import { readPhoto } from "@/lib/server/db";

export async function GET(_request: Request, { params }: { params: Promise<{ name: string }> }) {
  if (!(await currentUserId())) return new Response(null, { status: 401 });
  const photo = await readPhoto((await params).name);
  if (!photo) return new Response(null, { status: 404 });
  return new Response(new Uint8Array(photo.bytes), {
    headers: { "Content-Type": photo.type, "Cache-Control": "private, max-age=31536000, immutable" },
  });
}
