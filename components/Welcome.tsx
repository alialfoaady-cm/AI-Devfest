"use client";

import { Coins, Key, MapPin } from "@phosphor-icons/react";
import { useState } from "react";
import { STARTING_CREDITS } from "@/lib/config";
import { signIn, useTask } from "@/lib/store";
import { AirportMap } from "./AirportMap";
import { Notice, btnPrimary, field } from "./ui";

const STEPS = [
  { Icon: MapPin, name: "Lend", detail: "Park at the airport, drop a pin on your car and leave the key in a locker." },
  { Icon: Coins, name: "Earn", detail: "Every day a traveller borrows it earns you one credit." },
  { Icon: Key, name: "Borrow", detail: "Spend credits on a car where you land. One credit is one day." },
];

/** What someone sees before they have an account: what Sayara is, and the way in. */
export function Welcome() {
  const [mode, setMode] = useState<"signup" | "signin">("signup");
  const { busy, error, run, clearError } = useTask();
  const joining = mode === "signup";

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const text = (name: string) => String(form.get(name) ?? "");
    run(() => signIn({ mode, name: text("name"), email: text("email"), password: text("password") }));
  }

  const step = (index: number) => ({ "--i": index }) as React.CSSProperties;

  return (
    <>
      <section className="mx-auto grid max-w-7xl gap-10 px-4 py-10 [--enter-d:800ms] sm:px-6 lg:grid-cols-2 lg:items-center lg:gap-16 lg:px-16 lg:py-16">
        <div>
          <h1 style={step(0)} className="enter text-balance text-4xl font-bold leading-[1.1] tracking-[-0.03em] sm:text-5xl lg:text-[3.25rem]">
            Lend your car at the airport. Borrow one where you land.
          </h1>
          <p style={step(1)} className="enter mt-4 max-w-md text-lg text-ink-soft">
            No money changes hands. A day lent is a day you can borrow.
          </p>

          <form style={step(2)} onSubmit={submit} className="enter mt-8 max-w-md space-y-3">
            {joining && (
              <label className="block font-medium">
                Your name
                <input className={field} name="name" required maxLength={40} autoComplete="name" />
              </label>
            )}
            <label className="block font-medium">
              Email
              <input className={field} name="email" type="email" required autoComplete="email" />
            </label>
            <label className="block font-medium">
              Password
              <input
                className={field}
                name="password"
                type="password"
                required
                minLength={8}
                autoComplete={joining ? "new-password" : "current-password"}
                aria-describedby={joining ? "password-help" : undefined}
              />
              {joining && (
                <span id="password-help" className="mt-1.5 block text-sm font-normal text-ink-soft">
                  At least 8 characters.
                </span>
              )}
            </label>
            <Notice>{error}</Notice>
            <div className="flex flex-wrap items-center gap-x-5 gap-y-2 pt-1">
              <button type="submit" className={btnPrimary} disabled={busy}>
                {busy ? "One moment" : joining ? "Create account" : "Sign in"}
              </button>
              <button
                type="button"
                className="h-11 font-medium underline decoration-line decoration-2 underline-offset-4 transition-colors duration-150 hover:decoration-ink"
                onClick={() => {
                  setMode(joining ? "signin" : "signup");
                  clearError();
                }}
              >
                {joining ? "I have an account" : "Create an account"}
              </button>
            </div>
            {joining && <p className="text-sm text-ink-soft">New accounts start with {STARTING_CREDITS} credits, enough for a first week away.</p>}
          </form>
        </div>

        <AirportMap style={step(3)} className="enter" />
      </section>

      <section aria-labelledby="how-heading" className="mx-auto max-w-7xl px-4 pb-16 sm:px-6 lg:px-16">
        <h2 id="how-heading" className="text-3xl font-bold tracking-tight sm:text-4xl">
          How Sayara works
        </h2>
        <ol className="mt-6 grid gap-4 md:grid-cols-3">
          {STEPS.map(({ Icon, name, detail }) => (
            <li key={name} className="rounded-xl bg-surface p-6">
              <Icon size={32} aria-hidden />
              <h3 className="mt-8 text-xl font-bold tracking-tight">{name}</h3>
              <p className="mt-1 text-ink-soft">{detail}</p>
            </li>
          ))}
        </ol>
      </section>
    </>
  );
}
