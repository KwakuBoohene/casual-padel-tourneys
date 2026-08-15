type MatchStatus = "live" | "next" | "completed" | "pending";

interface MatchCardProps {
  court: number;
  teamA: Array<{ id: string; name: string }>;
  teamB: Array<{ id: string; name: string }>;
  scoreA?: number;
  scoreB?: number;
  status?: MatchStatus;
  highlightPlayers?: string[];
}

function formatTeam(team: Array<{ id: string; name: string }>): string {
  return team.map((player) => player.name).join("/");
}

export function MatchCard({
  court,
  teamA,
  teamB,
  scoreA,
  scoreB,
  status = "pending",
  highlightPlayers = []
}: MatchCardProps) {
  const hasScore = scoreA !== undefined && scoreB !== undefined;
  const highlighted =
    highlightPlayers.length > 0 &&
    [...teamA, ...teamB].some(
      (player) => highlightPlayers.includes(player.id) || highlightPlayers.includes(player.name)
    );

  let statusText = "Pending";
  if (hasScore) {
    statusText = `${scoreA}–${scoreB}`;
  } else if (status === "live") {
    statusText = "Live";
  } else if (status === "next") {
    statusText = "Next";
  }

  return (
    <article
      className={[
        "rounded-2xl border border-padel-border bg-padel-surface p-4 space-y-2",
        highlighted ? "border-padel-primary border-2" : "",
        status === "live" && !hasScore ? "ring-0" : ""
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
