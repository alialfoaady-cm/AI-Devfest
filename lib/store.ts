"use client";
// The one module that touches localStorage. Everything else reads state through useStore()
// and changes it through update(), passing a pure function from lib/rules.ts or lib/inspections.ts.

import { useSyncExternalStore } from "react";
import { DEFAULT_USER_ID, SAMPLE_STATE } from "./sampleData";
import type { State } from "./types";

const KEY = "carswap:v1";

type Saved = { state: State; currentUserId: string };
const SEED: Saved = { state: SAMPLE_STATE, currentUserId: DEFAULT_USER_ID };

let cache: Saved | null = null;
const listeners = new Set<() => void>();

function read(): Saved {
  if (cache) return cache;
  try {
    const raw = localStorage.getItem(KEY);
    cache = raw ? (JSON.parse(raw) as Saved) : SEED;
  } catch {
    cache = SEED;
  }
  return cache;
}

function write(next: Saved) {
  cache = next;
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch (error) {
    // shortcut: photos are stored as data URLs and localStorage holds about 5 MB. When it is
    // full the app keeps running from memory until reload. Upgrade to IndexedDB if that bites.
    console.warn("CarSwap could not save to localStorage; state is in memory only.", error);
  }
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  // A second tab or window on the same laptop stays in step.
  const onStorage = (event: StorageEvent) => {
    if (event.key !== KEY) return;
    cache = null;
    listener();
  };
  listeners.add(listener);
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

export function useStore(): Saved {
  return useSyncExternalStore(subscribe, read, () => SEED);
}

/** Applies a pure state change. If it throws (a broken rule), nothing is saved. */
export function update(change: (state: State) => State) {
  const saved = read();
  write({ ...saved, state: change(saved.state) });
}

export function setCurrentUser(currentUserId: string) {
  write({ ...read(), currentUserId });
}

export function resetToSampleData() {
  write(SEED);
}
