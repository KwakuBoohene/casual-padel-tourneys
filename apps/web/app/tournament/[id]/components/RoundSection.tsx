"use client";

import { ReactNode, useState } from "react";

interface RoundSectionProps {
  title: string;
  roundNumber?: number;
  matchCount: number;
  completedMatches?: number;
  isLive?: boolean;
  isCollapsible?: boolean;
  defaultExpanded?: boolean;
  children: ReactNode;
}

export function RoundSection({
  title,
  roundNumber,
  matchCount,
  completedMatches,
  isLive = false,
  isCollapsible = false,
  defaultExpanded = true,
  children
}: RoundSectionProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  const toggleExpanded = () => {
    if (isCollapsible) {
      setIsExpanded(!isExpanded);
    }
  };

  return (
    <div
      className={`
        rounded-2xl border px-4 py-3 sm:px-6 sm:py-5 space-y-3 sm:space-y-4 transition-all
        ${isLive ? "bg-slate-800/95 border-padel-primary shadow-2xl shadow-padel-primary/20" : "bg-slate-800/80 border-slate-700/60"}
        ${isCollapsible ? "cursor-pointer hover:border-slate-600/80" : ""}
      `}
    >
      <div
        className="flex items-center justify-between"
        onClick={toggleExpanded}
        role={isCollapsible ? "button" : undefined}
        aria-expanded={isCollapsible ? isExpanded : undefined}
      >
        <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
          <span className="text-xs sm:text-sm uppercase tracking-widest font-bold">
            <span className="text-padel-primary">{title.split(" ")[0]}</span>
            <span className="text-padel-text"> {title.split(" ").slice(1).join(" ")}</span>
          </span>
          {completedMatches !== undefined && (
            <span className="text-[9px] sm:text-[10px] px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-md bg-padel-primary/10 text-padel-primary border border-padel-primary/30 font-bold uppercase tracking-wider">
              {completedMatches}/{matchCount}
            </span>
          )}
          {isLive && (
            <span className="text-[10px] sm:text-[11px] px-2 py-1 sm:px-3 sm:py-1.5 rounded-full bg-padel-statusLive text-padel-background font-extrabold uppercase tracking-wider shadow-lg shadow-padel-statusLive/30">
              ● LIVE
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          {isCollapsible && (
            <svg
              className={`h-5 w-5 text-padel-muted transition-transform ${isExpanded ? "rotate-180" : ""}`}
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              viewBox="0 0 24 24"
            >
              <path d="m6 9 6 6 6-6" />
            </svg>
          )}
        </div>
      </div>

      {isExpanded && <div className="space-y-3 animate-slide-down">{children}</div>}
    </div>
  );
}
