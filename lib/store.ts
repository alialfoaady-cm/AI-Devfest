"use client";
// The browser's copy of the data. The server owns the real thing (lib/server); this module fetches
// the part the signed-in user may see, keeps it fresh, and sends every change as an action.

import { useState, useSyncExternalStore } from "react";
import type { State } from "./types";

type Session = {
  /** False until the first answer from the server. */
  ready: boolean;
  /** The signed-in user's id, or null. */
  currentUserId: string | null;
  state: State;
};

const EMPTY: State = { users: [], cars: [], bookings: [], inspections: [] };
const START: Session = { ready: false, currentUserId: null, state: EMPTY };
const REFRESH_MS = 4000; // how soon one person sees what another did

let session = START;
let lastAnswer = "";
let timer: ReturnType<typeof setInterval> | null = null;
const listeners = new Set<() => void>();

function set(next: Session) {
  session = next;
  listeners.forEach((listener) => listener());
}

export async function refresh() {
  try {
    const answer = await (await fetch("/api/state", { cache: "no-store" })).text();
    if (answer === lastAnswer) return; // nothing changed: no re-render
    lastAnswer = answer;
    const body = JSON.parse(answer) as { me: string | null; state?: State };
    set({ ready: true, currentUserId: body.me, state: body.state ?? EMPTY });
  } catch {
    // Offline or the server is restarting: keep showing what we have and try again on the next tick.
  }
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  if (!timer) {
    refresh();
    timer = setInterval(() => document.visibilityState === "visible" && refresh(), REFRESH_MS);
    document.addEventListener("visibilitychange", refresh);
  }
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0 && timer) {
      clearInterval(timer);
      timer = null;
      document.removeEventListener("visibilitychange", refresh);
    }
  };
}

export function useStore(): Session {
  return useSyncExternalStore(
    subscribe,
    () => session,
    () => START,
  );
}

async function post(url: string, method: string, body?: unknown) {
  const response = await fetch(url, {
    method,
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const answer = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(answer.error ?? "That did not work. Try again.");
  return answer;
}

/** Asks the server to change something. Resolves with the new data, or throws a message for the user. */
export async function act(type: string, payload: Record<string, unknown>): Promise<State> {
  const { state } = (await post("/api/action", "POST", { type, ...payload })) as { state: State };
  lastAnswer = "";
  set({ ...session, state });
  return state;
}

export async function signIn(fields: { mode: "signup" | "signin"; name?: string; email: string; password: string }) {
  await post("/api/auth", "POST", fields);
  await refresh();
}

export async function signOut() {
  await post("/api/auth", "DELETE");
  lastAnswer = "";
  set({ ready: true, currentUserId: null, state: EMPTY });
}

/** For a button that changes something: runs the work, and tracks "busy" and the error to show. */
export function useTask() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function run<T>(work: () => Promise<T>): Promise<T | undefined> {
    setBusy(true);
    setError("");
    try {
      return await work();
    } catch (problem) {
      setError(problem instanceof Error ? problem.message : "That did not work. Try again.");
    } finally {
      setBusy(false);
    }
  }
  return { busy, error, run, clearError: () => setError("") };
}
