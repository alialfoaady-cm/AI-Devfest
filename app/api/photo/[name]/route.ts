// GET /api/photo/<name> -> the stored image. A car's listing photo is public, like the listing;
// every other photo (pickup and return) is for signed-in users. Names are long random strings.
import { currentUserId } from "@/lib/server/auth";
import { readDb, readPhoto } from "@/lib/server/db";

export async function GET(_request: Request, { params }: { params: Promise<{ name: string }> }) {
  const { name } = await params;
  const listed = async () => (await readDb()).state.cars.some((car) => car.photo === `/api/photo/${name}`);
  if (!(await currentUserId()) && !(await listed())) return new Response(null, { status: 401 });
  const photo = await readPhoto(name);
  if (!photo) return new Response(null, { status: 404 });
  return new Response(new Uint8Array(photo.bytes), {
    headers: { "Content-Type": photo.type, "Cache-Control": "private, max-age=31536000, immutable" },
  });
}
