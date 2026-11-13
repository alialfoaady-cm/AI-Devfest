"use client";

import { CaretLeft, PaperPlaneRight } from "@phosphor-icons/react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Initial, Notice, btnQuiet, card, heading } from "@/components/ui";
import { MAX_MESSAGE_CHARS, conversation, messagesOf } from "@/lib/chat";
import { messageTime, shortDate } from "@/lib/format";
import { act, useStore, useTask } from "@/lib/store";

/** One trip's conversation between its borrower and the car's owner. New messages arrive with the store's refresh. */
export default function ChatPage() {
  const { id } = useParams<{ id: string }>();
  const { state, currentUserId } = useStore();
  const [draft, setDraft] = useState("");
  const { busy, error, run } = useTask();
  const composer = useRef<HTMLFormElement>(null);

  const chat = conversation(state, currentUserId ?? "", id);
  const messages = messagesOf(state, id);

  // Keep the newest message and the box you type in on screen.
  useEffect(() => {
    composer.current?.scrollIntoView({ block: "end" });
  }, [messages.length]);

  if (!chat) {
    return (
      <div className={`${card} max-w-md p-5`}>
        <h1 className={heading}>This conversation is not here</h1>
        <p className="my-3 text-ink-soft">A conversation belongs to a trip, and only its two people can open it.</p>
        <Link href="/chat" className={`${btnQuiet} w-full`}>
          All conversations
        </Link>
      </div>
    );
  }

  const { booking, car, otherId } = chat;
  const other = state.users.find((u) => u.id === otherId)?.name.split(" ")[0] ?? "Someone";

  async function send(event: React.FormEvent) {
    event.preventDefault();
    if (await run(() => act("sendMessage", { bookingId: id, text: draft }))) setDraft("");
  }

  return (
    <section aria-labelledby="chat-heading" className="mx-auto max-w-2xl">
      <Link href="/chat" className="inline-flex h-11 items-center gap-1 text-sm font-semibold text-ink-soft transition-colors duration-150 hover:text-ink">
        <CaretLeft size={14} weight="bold" aria-hidden />
        All conversations
      </Link>

      <header className="flex items-center gap-3 border-b border-line pb-4">
        <Initial name={other} />
        <div className="min-w-0 flex-1">
          <h1 id="chat-heading" className={heading}>
            {other}
          </h1>
          <p className="truncate text-sm text-ink-soft">
            {car.model} at {car.airport}, {shortDate(booking.from)} to {shortDate(booking.to)}
          </p>
        </div>
        <Link href={`/trips/${booking.id}`} className="shrink-0 text-sm font-semibold underline underline-offset-4">
          View trip
        </Link>
      </header>

      <div role="log" aria-label={`Messages with ${other}`} className="py-5">
        {messages.length === 0 && (
          <p className="py-8 text-center text-ink-soft">No messages yet. Say hello to {other} and sort out the handover.</p>
        )}
        <ol className="space-y-3">
          {messages.map((message) => {
            const mine = message.from === currentUserId;
            return (
              <li key={message.id} className={`flex flex-col ${mine ? "items-end" : "items-start"}`}>
                <p
                  className={`max-w-[80%] whitespace-pre-wrap rounded-2xl px-3.5 py-2 [overflow-wrap:anywhere] ${
                    mine ? "rounded-br-md bg-green text-on-green" : "rounded-bl-md bg-surface-2"
                  }`}
                >
                  <span className="sr-only">{mine ? "You: " : `${other}: `}</span>
                  {message.text}
                </p>
                <time dateTime={message.at} className="mt-1 px-1 text-xs text-ink-soft">
                  {messageTime(message.at)}
                </time>
              </li>
            );
          })}
        </ol>
      </div>

      {/* Stays above the tab bar on phones while the messages scroll behind it. */}
      <form ref={composer} onSubmit={send} className="sticky bottom-16 scroll-mb-20 space-y-2 bg-canvas pb-3 pt-2 md:bottom-0 md:scroll-mb-4">
        <Notice>{error}</Notice>
        <div className="flex items-center gap-2 rounded-full border border-line bg-surface py-1.5 pl-5 pr-1.5 transition-colors duration-200 focus-within:border-ink">
          <input
            aria-label={`Message ${other}`}
            placeholder={`Message ${other}`}
            maxLength={MAX_MESSAGE_CHARS}
            autoComplete="off"
            enterKeyHint="send"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            // 16px text on phones so iOS does not zoom in when the box is focused.
            className="h-11 min-w-0 flex-1 bg-transparent text-base outline-none! placeholder:text-ink-soft"
          />
          <button
            type="submit"
            aria-label="Send"
            disabled={busy || !draft.trim()}
            className="grid size-11 shrink-0 place-items-center rounded-full bg-green text-on-green transition-[opacity,scale] duration-150 ease-out active:scale-95 disabled:opacity-40"
          >
            <PaperPlaneRight size={20} weight="fill" aria-hidden />
          </button>
        </div>
      </form>
    </section>
  );
}
