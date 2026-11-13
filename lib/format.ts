/** "2026-12-20" -> "Dec 20" */
export function shortDate(date: string): string {
  return new Date(`${date}T00:00:00Z`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

export const plural = (count: number, word: string) => `${count} ${word}${count === 1 ? "" : "s"}`;
