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

export const plural = (count: number, word: string) => `${count} ${word}${count === 1 ? "" : "s"}`;
