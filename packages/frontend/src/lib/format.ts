const RELATIVE_DIVISIONS: Array<{ amount: number; unit: Intl.RelativeTimeFormatUnit }> = [
  { amount: 60, unit: "second" },
  { amount: 60, unit: "minute" },
  { amount: 24, unit: "hour" },
  { amount: 7, unit: "day" },
  { amount: 4.34524, unit: "week" },
  { amount: 12, unit: "month" },
  { amount: Number.POSITIVE_INFINITY, unit: "year" },
];

const rtf = new Intl.RelativeTimeFormat("en", { numeric: "auto" });

/** "3m ago"-style relative time (docs/ux.md §6 — absolute on hover via title). */
export function relativeTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "—";
  let duration = (then - Date.now()) / 1000;
  for (const d of RELATIVE_DIVISIONS) {
    if (Math.abs(duration) < d.amount) {
      return rtf.format(Math.round(duration), d.unit);
    }
    duration /= d.amount;
  }
  return "—";
}

export function absoluteTime(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "" : d.toISOString();
}

/** Render slugs/identifiers in monospace (docs/ux.md §6). */
export const MONO_CLASS = "font-mono text-xs";
