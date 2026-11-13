"use client";

import { X } from "@phosphor-icons/react";
import { useId, useState } from "react";
import { STARTING_CREDITS } from "@/lib/config";
import { signIn, useTask } from "@/lib/store";
import { Notice, btnPrimary, field } from "./ui";

/** Opens the sign-in window from anywhere: the top bar, or a Book button pressed by a visitor. */
export function openAuth() {
  (document.getElementById("auth") as HTMLDialogElement | null)?.showModal();
}

/** Create an account, or sign in to one. Signing in changes what the store holds, which closes whatever asked. */
export function AuthForm() {
  const [mode, setMode] = useState<"signup" | "signin">("signup");
  const { busy, error, run, clearError } = useTask();
  const helpId = useId();
  const joining = mode === "signup";

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const text = (name: string) => String(form.get(name) ?? "");
    run(() => signIn({ mode, name: text("name"), email: text("email"), password: text("password") }));
  }

  return (
    <form onSubmit={submit} className="space-y-3">
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
          aria-describedby={joining ? helpId : undefined}
        />
        {joining && (
          <span id={helpId} className="mt-1.5 block text-sm font-normal text-ink-soft">
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
  );
}

/** The sign-in window. The shell renders it only while nobody is signed in. */
export function AuthDialog() {
  return (
    <dialog
      id="auth"
      aria-labelledby="auth-title"
      className="pop m-auto w-[min(92vw,26rem)] rounded-3xl border border-line bg-surface p-0 text-ink backdrop:bg-black/60"
    >
      <div className="flex items-center justify-between border-b border-line py-2 pl-5 pr-2">
        <h2 id="auth-title" className="font-bold">
          Log in or sign up
        </h2>
        <form method="dialog">
          <button aria-label="Close" className="grid size-10 place-items-center rounded-full hover:bg-surface-2">
            <X size={18} weight="bold" aria-hidden />
          </button>
        </form>
      </div>
      <div className="p-5">
        <p className="mb-4 text-ink-soft">Anyone can browse. You need an account to book a car or lend yours.</p>
        <AuthForm />
      </div>
    </dialog>
  );
}
