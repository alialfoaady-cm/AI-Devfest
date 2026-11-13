"use client";

import { Key, MagnifyingGlass, Moon, Path, SignOut, Sun } from "@phosphor-icons/react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { plural } from "@/lib/format";
import { signOut, useStore } from "@/lib/store";
import { setTheme, useTheme } from "./theme";
import { Welcome } from "./Welcome";

const TABS = [
  { href: "/", label: "Find a car", short: "Find", Icon: MagnifyingGlass, match: (path: string) => path === "/" },
  { href: "/trips", label: "Trips", short: "Trips", Icon: Path, match: (path: string) => path.startsWith("/trips") },
  { href: "/lend", label: "Lend my car", short: "Lend", Icon: Key, match: (path: string) => path.startsWith("/lend") },
];

const roundButton =
  "grid size-10 place-items-center rounded-full text-white/80 transition-colors duration-150 hover:bg-white/10 hover:text-white focus-visible:outline-white";

/** A black bar across the top in both themes; on phones the three sections move to a tab bar at the bottom. */
export function AppShell({ children }: { children: React.ReactNode }) {
  const { ready, currentUserId, state } = useStore();
  const router = useRouter();
  const pathname = usePathname();
  const theme = useTheme();
  const me = state.users.find((user) => user.id === currentUserId);

  return (
    <div className="flex min-h-dvh flex-col">
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-canvas focus:px-4 focus:py-2">
        Skip to content
      </a>

      <header className="sticky top-0 z-30 bg-black text-white">
        <div className="mx-auto flex h-16 max-w-7xl items-center gap-8 px-4 sm:px-6 lg:px-16">
          <Link href="/" className="flex h-11 items-center text-2xl font-bold tracking-tight focus-visible:outline-white">
            Sayara
          </Link>

          {me && (
            <nav aria-label="Main" className="hidden md:block">
              <ul className="flex gap-1">
                {TABS.map(({ href, label, match }) => (
                  <li key={href}>
                    <Link
                      href={href}
                      aria-current={match(pathname) ? "page" : undefined}
                      className={`flex h-10 items-center rounded-full px-4 text-sm font-medium transition-colors duration-150 focus-visible:outline-white ${
                        match(pathname) ? "bg-white/15 text-white" : "text-white/75 hover:bg-white/10 hover:text-white"
                      }`}
                    >
                      {label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          )}

          <div className="ml-auto flex items-center gap-1.5">
            {me && (
              <>
                <span className="max-w-32 truncate text-sm font-medium text-white/75 max-sm:hidden">{me.name}</span>
                <p className="mx-1.5 rounded-full bg-green px-3 py-1.5 text-sm font-semibold tabular-nums text-on-green" aria-live="polite">
                  {plural(me.credits, "credit")}
                </p>
              </>
            )}
            <button
              type="button"
              className={roundButton}
              aria-label={theme === "dark" ? "Switch to light theme" : "Switch to dark theme"}
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            >
              {theme === "dark" ? <Sun size={20} aria-hidden /> : <Moon size={20} aria-hidden />}
            </button>
            {me && (
              <button
                type="button"
                aria-label="Sign out"
                title="Sign out"
                className={roundButton}
                onClick={async () => {
                  await signOut();
                  router.push("/");
                }}
              >
                <SignOut size={20} aria-hidden />
              </button>
            )}
          </div>
        </div>
      </header>

      <main id="main" tabIndex={-1} className={`flex-1 outline-none ${me ? "pb-24 md:pb-12" : ""}`}>
        {ready &&
          (me ? (
            // A short fade when the section changes, so the new screen does not snap in.
            <div key={pathname} className="enter mx-auto w-full max-w-7xl px-4 pt-8 sm:px-6 sm:pt-10 lg:px-16">
              {children}
            </div>
          ) : (
            <Welcome />
          ))}
      </main>

      {me && (
        <nav aria-label="Main" className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-canvas md:hidden">
          <ul className="grid grid-cols-3 pb-[env(safe-area-inset-bottom)]">
            {TABS.map(({ href, short, Icon, match }) => {
              const active = match(pathname);
              return (
                <li key={href}>
                  <Link
                    href={href}
                    aria-current={active ? "page" : undefined}
                    className={`flex h-16 flex-col items-center justify-center gap-0.5 text-xs font-medium ${active ? "text-ink" : "text-ink-soft"}`}
                  >
                    <Icon size={24} weight={active ? "fill" : "regular"} aria-hidden />
                    {short}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      )}
    </div>
  );
}
