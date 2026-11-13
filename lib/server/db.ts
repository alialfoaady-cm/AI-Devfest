// The server's data: one JSON file and a folder of photos. Every change goes through transact(),
// which runs changes one at a time and replaces the file in a single step, so a crash or two
// requests at once cannot leave half a write behind.
// shortcut: a file on this machine's disk. Right for one server process (a laptop, or one small host
// with a disk). Move to a real database before running several instances or on serverless hosting.
import { randomBytes } from "node:crypto";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import type { State } from "../types";

export type Account = { userId: string; email: string; salt: string; hash: string };
export type Db = {
  state: State;
  accounts: Account[];
  /** Session token -> user id. */
  sessions: Record<string, string>;
};

const DATA_DIR = process.env.SAYARA_DATA_DIR ?? path.join(process.cwd(), ".data");
const FILE = path.join(DATA_DIR, "sayara.json");
const PHOTO_DIR = path.join(DATA_DIR, "photos");
const MAX_PHOTO_BYTES = 2_000_000;

const empty = (): Db => ({ state: { users: [], cars: [], bookings: [], inspections: [] }, accounts: [], sessions: {} });

export async function readDb(): Promise<Db> {
  try {
    return JSON.parse(await readFile(FILE, "utf8")) as Db;
  } catch (error) {
    // Only "no file yet" means "empty". Any other failure must stop here, or the next write
    // would replace real data with an empty file.
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return empty();
    throw error;
  }
}

// One queue for the whole process, kept on globalThis because each route is bundled separately in dev.
const shared = globalThis as unknown as { __sayaraQueue?: Promise<unknown> };

/** Reads the data, applies `change`, and saves the result. If `change` throws, nothing is saved. */
export function transact<T>(change: (db: Db) => Promise<{ db: Db; result: T }> | { db: Db; result: T }): Promise<T> {
  const run = (shared.__sayaraQueue ?? Promise.resolve()).then(async () => {
    const { db, result } = await change(await readDb());
    await mkdir(DATA_DIR, { recursive: true });
    const temp = `${FILE}.${randomBytes(4).toString("hex")}.tmp`;
    await writeFile(temp, JSON.stringify(db));
    await rename(temp, FILE);
    return result;
  });
  shared.__sayaraQueue = run.catch(() => {});
  return run;
}

const PHOTO_NAME = /^[a-f0-9]{32}\.(jpg|png)$/;

/** Stores a photo sent as a data URL and returns the path it is served from. */
export async function savePhoto(dataUrl: unknown): Promise<string> {
  const match = typeof dataUrl === "string" ? /^data:image\/(jpeg|png);base64,([A-Za-z0-9+/=]+)$/.exec(dataUrl) : null;
  if (!match) throw new Error("That photo could not be read. Take it again.");
  const bytes = Buffer.from(match[2], "base64");
  if (bytes.length > MAX_PHOTO_BYTES) throw new Error("That photo is too large. Take it again.");
  const name = `${randomBytes(16).toString("hex")}.${match[1] === "png" ? "png" : "jpg"}`;
  await mkdir(PHOTO_DIR, { recursive: true });
  await writeFile(path.join(PHOTO_DIR, name), bytes);
  return `/api/photo/${name}`;
}

/** The bytes of a stored photo, or null if the name is not one savePhoto made. */
export async function readPhoto(name: string): Promise<{ bytes: Buffer; type: string } | null> {
  if (!PHOTO_NAME.test(name)) return null; // also stops any path outside the photo folder
  try {
    return { bytes: await readFile(path.join(PHOTO_DIR, name)), type: name.endsWith(".png") ? "image/png" : "image/jpeg" };
  } catch {
    return null;
  }
}
