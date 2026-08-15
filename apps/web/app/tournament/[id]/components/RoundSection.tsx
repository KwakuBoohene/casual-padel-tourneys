"use client";

import { ReactNode, useState } from "react";

interface RoundSectionProps {
  title: string;
  matchCount: number;
  completedMatches?: number;
  isLive?: boolean;
  isCollapsible?: boolean;
  defaultExpanded?: boolean;
  children: ReactNode;
}

export function RoundSection({
  title,
  matchCount,
  completedMatches,
  isLive = false,
  isCollapsible = false,
  defaultExpanded = true,
  children
}: RoundSectionProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  return (
    <div className="space-y-3">
      <button
        type="button"
        disabled={!isCollapsible}
        onClick={() => {
          if (isCollapsible) setIsExpanded((prev) => !prev);
        }}
        className={[
          "w-full flex items-center justify-between gap-3 text-left",
          isCollapsible
            ? "min-h-12 px-4 rounded-2xl border border-padel-border bg-padel-surface hover:bg-padel-surfaceAlt transition"
            : "px-1"
        ].join(" ")}
        aria-expanded={isCollapsible ? isExpanded : undefined}
      >
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-bold text-padel-text">{title}</span>
          {completedMatches !== undefined ? (
            <span className="text-[11px] px-2 py-0.5 rounded-md bg-padel-primary/10 text-padel-primary border border-padel-primary/30 font-semibold">
              {completedMatches}/{matchCount}
            </span>
          ) : null}
          {isLive ? (
            <span className="text-[11px] px-2 py-0.5 rounded-full bg-padel-primary/15 text-padel-primary font-bold uppercase tracking-wide">
              Live
            </span>
          ) : null}
        </div>
        {isCollapsible ? (
          <svg
            className={`h-5 w-5 shrink-0 text-padel-muted transition-transform ${isExpanded ? "rotate-180" : ""}`}
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            viewBox="0 0 24 24"
            aria-hidden
          >
            <path d="m6 9 6 6 6-6" />
          </svg>
        ) : null}
      </button>

      {isExpanded ? <div className="space-y-3 animate-slide-down">{children}</div> : null}
    </div>
  );
}
