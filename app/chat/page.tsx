"use client";

import { ChatCircle } from "@phosphor-icons/react";
import Link from "next/link";
import { Empty, Initial, btnPrimary, card, pageTitle } from "@/components/ui";
import { conversation, messagesOf } from "@/lib/chat";
import { messageTime, shortDate } from "@/lib/format";
import { useStore } from "@/lib/store";

/** Every conversation you are part of: one for each trip you booked, and one for each booking of a car you own. */
export default function ChatListPage() {
  const { state, currentUserId } = useStore();
  const me = currentUserId ?? "";

  const chats = state.bookings
    .flatMap((booking) => {
      const found = conversation(state, me, booking.id);
      return found ? [{ ...found, last: messagesOf(state, booking.id).at(-1) }] : [];
    })
    // The conversation with the newest message first; ones with no messages keep their trip order below.
    .sort((a, b) => (b.last?.at ?? "").localeCompare(a.last?.at ?? ""));
  const name = (userId: string) => state.users.find((u) => u.id === userId)?.name.split(" ")[0] ?? "Someone";

  return (
    <section aria-labelledby="chat-heading" className="mx-auto max-w-2xl">
      <h1 id="chat-heading" className={pageTitle}>
        Chat
      </h1>
      <p className="mt-2 text-ink-soft">Talk to the person on the other side of a trip: who you borrow from, and who borrows from you.</p>

      {chats.length === 0 ? (
        <div className="mt-6">
          <Empty
            icon={ChatCircle}
            title="No conversations yet"
            action={
              <Link href="/" className={btnPrimary}>
                Find a car
              </Link>
            }
          >
            When you book a car, or someone books yours, the two of you can message each other here.
          </Empty>
        </div>
      ) : (
        <ul className="mt-6 space-y-3">
          {chats.map(({ booking, car, otherId, last }) => (
            <li key={booking.id}>
              <Link
                href={`/chat/${booking.id}`}
                className={`${card} flex items-center gap-3 p-4 transition-colors duration-150 hover:border-ink-soft`}
              >
                <Initial name={name(otherId)} />
                <span className="min-w-0 flex-1">
                  <span className="flex items-baseline justify-between gap-3">
                    <span className="font-semibold">{name(otherId)}</span>
                    {last && <span className="shrink-0 text-xs text-ink-soft">{messageTime(last.at)}</span>}
                  </span>
                  <span className="block truncate text-sm text-ink-soft">
                    {car.model} at {car.airport}, {shortDate(booking.from)} to {shortDate(booking.to)}
                  </span>
                  <span className={`block truncate text-sm ${last ? "" : "text-ink-soft"}`}>
                    {last ? `${last.from === me ? "You: " : ""}${last.text}` : "No messages yet"}
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
