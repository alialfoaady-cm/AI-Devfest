"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { plural } from "@/lib/format";
import { resetToSampleData, setCurrentUser, useStore } from "@/lib/store";

export function Shell({ children }: { children: React.ReactNode }) {
  const { state, currentUserId } = useStore();
  const router = useRouter();
  const me = state.users.find((u) => u.id === currentUserId) ?? state.users[0];

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="sticky top-0 z-10">
        <div className="bg-lane">
          <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 px-4 py-2">
            <Link href="/" className="font-display text-3xl font-bold tracking-tight">
              CarSwap
            </Link>
            <fieldset className="flex rounded-md border-2 border-ink bg-lane p-0.5">
              <legend className="sr-only">Viewing as</legend>
              {state.users.map((user) => (
                <button
                  key={user.id}
                  type="button"
                  aria-pressed={user.id === me.id}
                  onClick={() => setCurrentUser(user.id)}
                  className={`min-h-11 rounded px-4 font-semibold transition-colors duration-150 ${
                    user.id === me.id ? "bg-ink text-white" : "text-ink hover:bg-lane-deep"
                  }`}
                >
                  {user.name.split(" ")[0]}
                </button>
              ))}
            </fieldset>
          </div>
        </div>
        <div className="bg-ink text-white">
          <p className="mx-auto flex max-w-3xl items-baseline justify-between px-4 py-1.5">
            <span>{me.name}</span>
            <span className="font-display text-2xl font-semibold tabular-nums" aria-live="polite">
              {plural(me.credits, "credit")}
            </span>
          </p>
        </div>
      </header>

      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-6">{children}</main>

      <footer className="mx-auto w-full max-w-3xl px-4 pb-8 text-ink-soft">
        <button
          type="button"
          className="min-h-11 underline underline-offset-4 hover:text-ink"
          onClick={() => {
            resetToSampleData();
            router.push("/");
          }}
        >
          Reset sample data
        </button>
        <p className="mt-1 text-sm">Demo build. Every person, car and code here is made up.</p>
      </footer>
    </div>
  );
}
