import Link from "next/link";

import { tournamentExportUrl } from "../app/tournament/[id]/lib/exportLinks";

interface LeaderboardHeaderActionsProps {
  tournamentId: string;
  /** Browser-reachable API origin — never the container-internal one. */
  publicApiBaseUrl: string;
}

const actionClass =
  "inline-flex items-center rounded-full border border-padel-border px-4 py-2 bg-padel-surface hover:bg-padel-surfaceAlt transition " +
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-padel-primary focus-visible:ring-offset-2 focus-visible:ring-offset-padel-background";

const labelClass = "text-[10px] uppercase tracking-[0.2em]";

/**
 * Downloads are plain anchors to the API. No fetch, no Blob: a scripted download is what
 * popup blockers stop, and the server already sends the filename via Content-Disposition.
 */
export function LeaderboardHeaderActions({
  tournamentId,
  publicApiBaseUrl
}: LeaderboardHeaderActionsProps) {
  return (
    <div className="flex flex-wrap items-center gap-3 text-xs text-padel-muted">
      <Link href={`/tournament/${tournamentId}`} className={actionClass}>
        <span className={labelClass}>Back to live view</span>
      </Link>
      <a href={tournamentExportUrl(publicApiBaseUrl, tournamentId, "pdf")} className={actionClass}>
        <span className={labelClass}>Download PDF</span>
      </a>
      <a href={tournamentExportUrl(publicApiBaseUrl, tournamentId, "csv")} className={actionClass}>
        <span className={labelClass}>Download CSV</span>
      </a>
    </div>
  );
}
