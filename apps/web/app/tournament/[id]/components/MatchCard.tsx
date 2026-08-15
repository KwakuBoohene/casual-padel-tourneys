import type { MatchSet, ScoringMode } from "@padel/shared";

import { spectatorRegularStatusLine } from "../lib/regularMatchDisplay";

type MatchStatus = "live" | "next" | "completed" | "pending";

interface MatchCardProps {
  court: number;
  teamA: Array<{ id: string; name: string }>;
  teamB: Array<{ id: string; name: string }>;
  scoreA?: number;
  scoreB?: number;
  sets?: MatchSet[];
  completed?: boolean;
  scoringMode?: ScoringMode;
  status?: MatchStatus;
  highlightPlayers?: string[];
}

function formatTeam(team: Array<{ id: string; name: string }>): string {
  return team.map((player) => player.name).join("/");
}

function americanoStatusText(
  scoreA: number | undefined,
  scoreB: number | undefined,
  status: MatchStatus
): string {
  const hasScore = scoreA !== undefined && scoreB !== undefined;
  if (hasScore) {
    return `${scoreA}–${scoreB}`;
  }
  if (status === "live") return "Live";
  if (status === "next") return "Next";
  return "Pending";
}

export function MatchCard({
  court,
  teamA,
  teamB,
  scoreA,
  scoreB,
  sets,
  completed = false,
  scoringMode,
  status = "pending",
  highlightPlayers = []
}: MatchCardProps) {
  const highlighted =
    highlightPlayers.length > 0 &&
    [...teamA, ...teamB].some(
      (player) => highlightPlayers.includes(player.id) || highlightPlayers.includes(player.name)
    );

  const statusText =
    scoringMode === "REGULAR"
      ? spectatorRegularStatusLine({ sets, completed, status })
      : americanoStatusText(scoreA, scoreB, status);

  return (
    <article
      className={[
        "rounded-2xl border border-padel-border bg-padel-surface p-4 space-y-2",
        highlighted ? "border-padel-primary border-2" : "",
        status === "live" && !completed ? "ring-0" : ""
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <p className="text-sm font-bold text-padel-primary">Court {court}</p>
      <p className="text-base font-semibold text-padel-text leading-snug">
        {formatTeam(teamA)} vs {formatTeam(teamB)}
      </p>
      <p className="text-sm font-medium text-padel-muted">{statusText}</p>
    </article>
  );
}
