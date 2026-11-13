// How the three verdicts look, shared by the photo tiles and the return report.
// Colour never stands alone: every verdict also has an icon and words.
import { CheckCircle, Question, Warning } from "@phosphor-icons/react";
import type { Verdict } from "@/lib/inspection/verdict";

export const VERDICT = {
  flagged: { label: "New damage flagged", short: "Flagged", Icon: Warning, pill: "bg-red-soft text-red", solid: "bg-red text-canvas", border: "border-red!", text: "text-red" },
  unsure: { label: "Unsure", short: "Unsure", Icon: Question, pill: "bg-amber-soft text-amber", solid: "bg-amber text-canvas", border: "border-amber!", text: "text-amber" },
  clear: { label: "No change found", short: "No change", Icon: CheckCircle, pill: "bg-green-soft text-green-ink", solid: "bg-green text-on-green", border: "", text: "text-green-ink" },
} satisfies Record<Verdict, object>;

export const VERDICT_ORDER: Verdict[] = ["flagged", "unsure", "clear"];

export function VerdictPill({ verdict, short = false, count }: { verdict: Verdict; short?: boolean; count?: number }) {
  // On a photo the pill is solid, so it reads over any picture; on a card it is a tint.
  const { Icon, pill, solid, label, short: brief } = VERDICT[verdict];
  return (
    <span className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-sm font-semibold ${short ? solid : pill}`}>
      <Icon size={18} weight="fill" aria-hidden />
      {count !== undefined && <span className="tabular-nums">{count}</span>}
      {short ? brief : label}
    </span>
  );
}
