import Link from "next/link";

import {
  tournamentExportUrl,
  type ExportLinkScope
} from "../app/tournament/[id]/lib/exportLinks";

interface LeaderboardHeaderActionsProps {
  tournamentId: string;
  /** Browser-reachable API origin — never the container-internal one. */
  publicApiBaseUrl: string;
}

const actionClass =
  "inline-flex items-center rounded-full border border-padel-border px-3 py-1.5 bg-padel-surface hover:bg-padel-surfaceAlt transition " +
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-padel-primary focus-visible:ring-offset-2 focus-visible:ring-offset-padel-background";

const labelClass = "text-[10px] uppercase tracking-[0.2em]";

const GROUPS: { scope: ExportLinkScope; label: string }[] = [
  { scope: "leaderboard", label: "Leaderboard" },
  { scope: "full", label: "Full results" }
];

/**
 * Downloads are plain anchors to the API. No fetch, no Blob: a scripted download is what
 * popup blockers stop, and the server already sends the filename via Content-Disposition.
 */
export function LeaderboardHeaderActions({
  tournamentId,
  publicApiBaseUrl
}: LeaderboardHeaderActionsProps) {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-padel-muted">
      <Link href={`/tournament/${tournamentId}`} className={actionClass}>
        <span className={labelClass}>Back to live view</span>
      </Link>
      {GROUPS.map((group) => (
        <div key={group.scope} className="flex items-center gap-2">
          <span className="text-[10px] uppercase tracking-[0.2em] text-padel-muted">
            {group.label}
          </span>
          {(["pdf", "csv"] as const).map((format) => (
            <a
              key={format}
              href={tournamentExportUrl(publicApiBaseUrl, tournamentId, format, group.scope)}
              className={actionClass}
              aria-label={`Download ${group.label} as ${format.toUpperCase()}`}
            >
              <span className={labelClass}>{format.toUpperCase()}</span>
            </a>
          ))}
        </div>
      ))}
    </div>
  );
}
