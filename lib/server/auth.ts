// Accounts and sessions. Passwords are stored only as salted scrypt hashes; the browser holds
// a random session token in an httpOnly cookie, never the password.
import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { STARTING_CREDITS } from "../config";
import { readDb, transact } from "./db";

const COOKIE = "sayara_session";
const THIRTY_DAYS = 60 * 60 * 24 * 30;

const hashPassword = (password: string, salt: string) => scryptSync(password, salt, 64);

export async function currentUserId(): Promise<string | null> {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return null;
  return (await readDb()).sessions[token] ?? null;
}

async function setSessionCookie(token: string, request: Request) {
  // Secure only when the site is on HTTPS, so sign-in also works over plain http on a local network.
  const https = (request.headers.get("x-forwarded-proto") ?? new URL(request.url).protocol).startsWith("https");
  (await cookies()).set(COOKIE, token, { httpOnly: true, sameSite: "lax", secure: https, path: "/", maxAge: THIRTY_DAYS });
}

function checkFields(email: unknown, password: unknown): { email: string; password: string } {
  if (typeof email !== "string" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 200) {
    throw new Error("Enter an email address, like name@example.com.");
  }
  if (typeof password !== "string" || password.length < 8 || password.length > 200) {
    throw new Error("Use a password of at least 8 characters.");
  }
  return { email: email.trim().toLowerCase(), password };
}

export async function signUp(request: Request, fields: { name?: unknown; email?: unknown; password?: unknown }) {
  const { email, password } = checkFields(fields.email, fields.password);
  const name = typeof fields.name === "string" ? fields.name.trim() : "";
  if (!name || name.length > 40) throw new Error("Enter your name, up to 40 characters.");

  const token = await transact((db) => {
    if (db.accounts.some((account) => account.email === email)) {
      throw new Error("That email already has an account. Sign in instead.");
    }
    const userId = `u-${randomBytes(6).toString("hex")}`;
    const salt = randomBytes(16).toString("hex");
    const session = randomBytes(32).toString("hex");
    return {
      db: {
        state: { ...db.state, users: [...db.state.users, { id: userId, name, credits: STARTING_CREDITS }] },
        accounts: [...db.accounts, { userId, email, salt, hash: hashPassword(password, salt).toString("hex") }],
        sessions: { ...db.sessions, [session]: userId },
      },
      result: session,
    };
  });
  await setSessionCookie(token, request);
}

export async function signIn(request: Request, fields: { email?: unknown; password?: unknown }) {
  const { email, password } = checkFields(fields.email, fields.password);
  const token = await transact((db) => {
    const account = db.accounts.find((a) => a.email === email);
    // Hash even when there is no account, so the answer takes the same time either way.
    const given = hashPassword(password, account?.salt ?? "no-such-account");
    if (!account || !timingSafeEqual(given, Buffer.from(account.hash, "hex"))) {
      throw new Error("That email and password do not match an account.");
    }
    const session = randomBytes(32).toString("hex");
    return { db: { ...db, sessions: { ...db.sessions, [session]: account.userId } }, result: session };
  });
  await setSessionCookie(token, request);
}

export async function signOut() {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  jar.delete(COOKIE);
  if (!token) return;
  await transact((db) => {
    const sessions = { ...db.sessions };
    delete sessions[token];
    return { db: { ...db, sessions }, result: null };
  });
}
