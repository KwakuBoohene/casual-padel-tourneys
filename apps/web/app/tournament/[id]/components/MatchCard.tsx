import { TeamAvatar } from "./TeamAvatar";

type MatchStatus = "live" | "next" | "completed" | "pending";

interface MatchCardProps {
  court: number;
  teamA: Array<{ id: string; name: string }>;
  teamB: Array<{ id: string; name: string }>;
  scoreA?: number;
  scoreB?: number;
  status?: MatchStatus;
  highlightPlayers?: string[];
  seedA?: number;
  seedB?: number;
  setNumber?: number;
}

function getStatusBadge(status: MatchStatus) {
  const badges = {
    live: {
      text: "● LIVE",
      bgColor: "live-badge",
      textColor: "",
      borderColor: "",
      animate: true
    },
    next: {
      text: "NEXT UP",
      bgColor: "bg-padel-status-next/20",
      textColor: "text-padel-status-next",
      borderColor: "border-padel-status-next/50",
      animate: false
    },
    completed: {
      text: "✓ DONE",
      bgColor: "bg-padel-status-completed/10",
      textColor: "text-padel-status-completed",
      borderColor: "border-padel-status-completed/30",
      animate: false
    },
    pending: {
      text: "PENDING",
      bgColor: "bg-padel-status-pending/20",
      textColor: "text-padel-status-pending",
      borderColor: "border-padel-status-pending/30",
      animate: false
    }
  };

  const badge = badges[status];

  return (
    <span
      className={`
        text-[10px] px-3 py-1 rounded-md font-extrabold uppercase tracking-wider
        ${badge.bgColor} ${badge.textColor} ${badge.borderColor ? `border ${badge.borderColor}` : ""}
        ${badge.animate ? "animate-pulse-soft" : ""}
        ${status === "next" ? "shadow-md shadow-padel-status-next/20" : ""}
      `}
    >
      {badge.text}
    </span>
  );
}

export function MatchCard({
  court,
  teamA,
  teamB,
  scoreA,
  scoreB,
  status = "pending",
  highlightPlayers = [],
  seedA,
  seedB,
  setNumber = 1
}: MatchCardProps) {
  const hasScore = scoreA !== undefined && scoreB !== undefined;
  const winnerA = hasScore && scoreA > scoreB;
  const winnerB = hasScore && scoreB > scoreA;
  const scoreDiff = hasScore ? Math.abs(scoreA - scoreB) : 0;

  const shouldHighlightTeam = (team: Array<{ id: string; name: string }>) => {
    return team.some(
      (player) => highlightPlayers.includes(player.id) || highlightPlayers.includes(player.name)
    );
  };

  const highlightTeamA = shouldHighlightTeam(teamA);
  const highlightTeamB = shouldHighlightTeam(teamB);

  const formatTeamNames = (team: Array<{ id: string; name: string }>) => {
    return team.map((player) => player.name).join(" / ");
  };

  return (
    <div
      className={`
        rounded-xl border border-padel-border/70 px-2.5 py-2.5 sm:px-4 sm:py-3.5
        surface-panel ${status === "live" ? "live-match-card" : ""}
        transition-all duration-200
        ${status === "live" ? "bg-padel-surface" : ""}
        ${status === "next" ? "bg-padel-surfaceAlt" : ""}
        ${status === "completed" ? "bg-padel-surface opacity-95" : ""}
        ${status === "pending" ? "bg-padel-surfaceAlt/90" : ""}
        animate-scale-in
      `}
    >
      {/* Header: Status */}
      <div className="live-card-header flex items-center justify-end mb-1.5 sm:mb-2">
        {getStatusBadge(status)}
      </div>

      {/* Teams and Score */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Team A */}
        <div className={`flex-1 min-w-0 ${highlightTeamA ? "animate-pulse-soft" : ""}`}>
          <div className="flex flex-col items-center gap-1.5">
            <TeamAvatar players={teamA} size="md" />
            <div className="w-full text-center">
              <p className="live-card-team-label text-[9px] sm:text-[10px] uppercase tracking-widest mb-1">
                <span className="live-card-accent text-padel-primary font-black">Team A</span>
                {seedA && (
                  <span className="live-card-accent text-padel-primary font-black ml-1.5">#{seedA}</span>
                )}
              </p>
              <div
                className={`
                space-y-0.5
                ${highlightTeamA ? "bg-padel-primary/20 px-1 rounded" : ""}
              `}
              >
                {teamA.map((player, idx) => (
                  <p
                    key={player.id || idx}
                    className="live-card-name text-xs sm:text-sm font-bold truncate text-padel-text"
                  >
                    {player.name}
                  </p>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Score */}
        <div className="flex flex-col items-center justify-center shrink-0">
          {hasScore ? (
            <>
              <div className="flex items-center gap-1.5 sm:gap-3 mb-0.5 sm:mb-1">
                <p
                  className={[
                    "live-card-score min-w-10 rounded-lg px-2 py-1 text-center text-xl sm:min-w-13 sm:text-3xl font-black transition-colors",
                    winnerA ? "bg-padel-primary/18 text-padel-primary" : "text-padel-text"
                  ].join(" ")}
                >
                  {scoreA}
                </p>
                <span className="live-card-meta text-lg sm:text-2xl text-padel-muted font-bold">-</span>
                <p
                  className={[
                    "live-card-score min-w-10 rounded-lg px-2 py-1 text-center text-xl sm:min-w-13 sm:text-3xl font-black transition-colors",
                    winnerB ? "bg-padel-primary/18 text-padel-primary" : "text-padel-text"
                  ].join(" ")}
                >
                  {scoreB}
                </p>
              </div>
              <p className="live-card-meta text-[8px] sm:text-[9px] uppercase tracking-widest text-padel-muted font-bold whitespace-nowrap">
                Court {court} • Set {setNumber}
              </p>
            </>
          ) : (
            <>
              <p className="live-card-name text-xs sm:text-sm font-bold text-padel-text uppercase">Pending</p>
              <p className="live-card-meta text-[8px] sm:text-[9px] uppercase tracking-widest text-padel-muted font-semibold mt-0.5">
                Court {court}
              </p>
            </>
          )}
        </div>

        {/* Team B */}
        <div className={`flex-1 min-w-0 ${highlightTeamB ? "animate-pulse-soft" : ""}`}>
          <div className="flex flex-col items-center gap-1.5">
            <TeamAvatar players={teamB} size="md" />
            <div className="w-full text-center">
              <p className="live-card-team-label text-[9px] sm:text-[10px] uppercase tracking-widest mb-1">
                {seedB && (
                  <span className="live-card-accent text-padel-primary font-black mr-1.5">#{seedB}</span>
                )}
                <span className="live-card-accent text-padel-primary font-black">Team B</span>
              </p>
              <div
                className={`
                space-y-0.5
                ${highlightTeamB ? "bg-padel-primary/20 px-1 rounded" : ""}
              `}
              >
                {teamB.map((player, idx) => (
                  <p
                    key={player.id || idx}
                    className="live-card-name text-xs sm:text-sm font-bold truncate text-padel-text"
                  >
                    {player.name}
                  </p>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
