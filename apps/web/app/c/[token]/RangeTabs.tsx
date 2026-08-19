import Link from "next/link";

import { CAREER_RANGES, type CareerRangeOption } from "./range";

const base =
  "inline-flex min-h-11 items-center rounded-full border px-4 text-sm font-semibold transition " +
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-padel-primary focus-visible:ring-offset-2 focus-visible:ring-offset-padel-background";

/**
 * Plain links rather than client state: the range lives in the URL, so a particular view stays
 * linkable and the page needs no JavaScript to switch.
 */
export function RangeTabs({ token, active }: { token: string; active: CareerRangeOption }) {
  return (
    <nav aria-label="Time period" className="flex flex-wrap gap-2">
      {CAREER_RANGES.map((range) => {
        const selected = range.id === active;
        return (
          <Link
            key={range.id}
            href={`/c/${encodeURIComponent(token)}?range=${range.id}`}
            aria-current={selected ? "page" : undefined}
            className={[
              base,
              selected
                ? "border-padel-primary bg-padel-primary/10 text-padel-primary"
                : "border-padel-border bg-padel-surface text-padel-muted hover:bg-padel-surfaceAlt"
            ].join(" ")}
          >
            {range.label}
          </Link>
        );
      })}
    </nav>
  );
}
