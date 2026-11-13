"use client";
// Light or dark. The value lives on <html data-theme>, set before first paint by the script in
// app/layout.tsx; this module reads it, changes it, and remembers the person's choice.
import { useSyncExternalStore } from "react";

export type Theme = "light" | "dark";

const read = (): Theme => (document.documentElement.dataset.theme === "dark" ? "dark" : "light");

function subscribe(onChange: () => void) {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
  return () => observer.disconnect();
}

export function useTheme(): Theme {
  return useSyncExternalStore(subscribe, read, () => "light");
}

export function setTheme(theme: Theme) {
  document.documentElement.dataset.theme = theme;
  try {
    localStorage.setItem("sayara-theme", theme);
  } catch {
    // Private browsing can refuse storage: the theme still changes for this visit.
  }
}
