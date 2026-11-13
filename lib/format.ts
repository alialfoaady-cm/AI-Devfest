/** "2026-12-20" -> "Dec 20" */
export function shortDate(date: string): string {
  return new Date(`${date}T00:00:00Z`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

/** Today, or a day `offset` days from today, as "YYYY-MM-DD" in the browser's own time zone. */
export function isoDay(offset = 0): string {
  const day = new Date();
  day.setDate(day.getDate() + offset);
  const two = (n: number) => String(n).padStart(2, "0");
  return `${day.getFullYear()}-${two(day.getMonth() + 1)}-${two(day.getDate())}`;
}

/** When a message was sent: "4:32 PM" today, "Nov 13, 4:32 PM" on any other day, in the reader's own time zone. */
export function messageTime(at: string): string {
  const sent = new Date(at);
  const time = sent.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  return sent.toDateString() === new Date().toDateString() ? time : `${sent.toLocaleDateString("en-US", { month: "short", day: "numeric" })}, ${time}`;
}

export const plural = (count: number, word: string) => `${count} ${word}${count === 1 ? "" : "s"}`;

/** 367.5 -> "$367.50" */
export const usd = (amount: number) => `$${amount.toFixed(2)}`;

/** "245 credits", "$367.50", or "100 credits + $217.50". */
export const payText = (paid: { credits: number; usd: number }) =>
  [paid.credits > 0 || paid.usd === 0 ? plural(paid.credits, "credit") : "", paid.usd > 0 ? usd(paid.usd) : ""].filter(Boolean).join(" + ");
