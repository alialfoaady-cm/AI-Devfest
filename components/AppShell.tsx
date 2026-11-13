"use client";

import { Key, MagnifyingGlass, Moon, Path, ShieldCheck, SignOut, Sun } from "@phosphor-icons/react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { plural } from "@/lib/format";
import { signOut, useStore } from "@/lib/store";
import { AuthDialog, openAuth } from "./AuthForm";
import { setTheme, useTheme } from "./theme";

const TABS = [
  { href: "/", label: "Find a car", short: "Find", Icon: MagnifyingGlass, match: (path: string) => path === "/" },
  { href: "/trips", label: "Trips", short: "Trips", Icon: Path, match: (path: string) => path.startsWith("/trips") },
  { href: "/lend", label: "Lend my car", short: "Lend", Icon: Key, match: (path: string) => path.startsWith("/lend") },
  { href: "/insurance", label: "Insurance", short: "Insure", Icon: ShieldCheck, match: (path: string) => path.startsWith("/insurance") },
];

const roundButton = "grid size-10 place-items-center rounded-full text-ink-soft transition-colors duration-150 hover:bg-surface hover:text-ink";

/**
 * The top bar: name on the left, the four sections in the middle, the account on the right.
 * On phones the sections move to a tab bar at the bottom. Anyone can open every section; the
 * sign-in window opens when a visitor tries to book, list a car or do anything else that changes data.
 */
export function AppShell({ children }: { children: React.ReactNode }) {
  const { ready, currentUserId, state } = useStore();
  const router = useRouter();
  const pathname = usePathname();
  const theme = useTheme();
  const me = state.users.find((user) => user.id === currentUserId);

  return (
    <div className="flex min-h-dvh flex-col">
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-xl focus:bg-canvas focus:px-4 focus:py-2">
        Skip to content
      </a>

      <header className="sticky top-0 z-30 border-b border-line bg-canvas">
        <div className="mx-auto grid h-16 max-w-7xl grid-cols-[1fr_auto_1fr] items-center gap-3 px-4 sm:px-6 md:h-20 lg:px-16">
          <Link href="/" className="flex h-11 items-center gap-1.5 justify-self-start text-2xl font-extrabold sm:gap-2 tracking-tight text-green-ink">
            {/* Same drawing as app/icon.svg, in the wordmark's colour. */}
            <svg viewBox="0 0 64 64" className="size-7 shrink-0 sm:size-8" aria-hidden>
              <mask id="logo-s">
                <circle cx="32" cy="32" r="32" fill="#fff" />
                <path d="M86.05-8.33L28.09 7.2A11 11 0 0 0 24.63 26.84L39.37 37.16A11 11 0 0 1 35.91 56.8L-22.05 72.33" fill="none" stroke="#000" strokeWidth="12" />
              </mask>
              <circle cx="32" cy="32" r="32" fill="currentColor" mask="url(#logo-s)" />
            </svg>
            Sayara
          </Link>

          <nav aria-label="Main" className="hidden md:block">
            <ul className="flex gap-1">
              {TABS.map(({ href, label, Icon, match }) => {
                const active = match(pathname);
                return (
                  <li key={href}>
                    <Link
                      href={href}
                      aria-current={active ? "page" : undefined}
                      className={`group relative flex h-20 flex-col items-center justify-center gap-1 px-4 text-sm transition-colors duration-200 ${
                        active ? "font-semibold text-ink" : "text-ink-soft hover:text-ink"
                      }`}
                    >
                      <Icon
                        size={28}
                        weight={active ? "fill" : "duotone"}
                        aria-hidden
                        className={`transition-transform duration-200 ease-out group-hover:scale-110 ${active ? "text-green-ink" : ""}`}
                      />
                      {label}
                      {/* The line under the section you are in grows from its middle. */}
                      <span
                        aria-hidden
                        className={`absolute inset-x-4 bottom-0 h-0.5 rounded-full bg-ink transition-transform duration-300 ease-out ${
                          active ? "scale-x-100" : "scale-x-0"
                        }`}
                      />
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>

          <div className="col-start-3 flex items-center gap-1.5 justify-self-end">
            {me && (
              <>
                <span className="max-w-32 truncate text-sm font-medium text-ink-soft max-sm:hidden">{me.name}</span>
                <p className="mx-1.5 rounded-full bg-green px-3 py-1.5 text-sm font-semibold tabular-nums text-on-green" aria-live="polite">
                  {plural(me.credits, "credit")}
                </p>
              </>
            )}
            {ready && !me && (
              <button
                type="button"
                onClick={openAuth}
                className="h-10 whitespace-nowrap rounded-full border border-line px-4 text-sm font-semibold transition-colors duration-150 hover:bg-surface"
              >
                Log in<span className="max-sm:sr-only"> or sign up</span>
              </button>
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

      <main id="main" tabIndex={-1} className="flex-1 pb-24 outline-none md:pb-12">
        {ready && (
          // A short fade when the section changes, so the new screen does not snap in.
          <div key={pathname} className="enter mx-auto w-full max-w-7xl px-4 pt-8 sm:px-6 sm:pt-10 lg:px-16">
            {children}
          </div>
        )}
      </main>

      {ready && !me && <AuthDialog />}

      <nav aria-label="Main" className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-canvas md:hidden">
        <ul className="grid grid-cols-4 pb-[env(safe-area-inset-bottom)]">
          {TABS.map(({ href, short, Icon, match }) => {
            const active = match(pathname);
            return (
              <li key={href}>
                <Link
                  href={href}
                  aria-current={active ? "page" : undefined}
                  className={`flex h-16 flex-col items-center justify-center gap-0.5 text-xs font-medium ${active ? "text-green-ink" : "text-ink-soft"}`}
                >
                  <Icon size={24} weight={active ? "fill" : "regular"} aria-hidden />
                  {short}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}
