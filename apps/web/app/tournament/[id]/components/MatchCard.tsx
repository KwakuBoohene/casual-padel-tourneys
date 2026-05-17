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
      bgColor: "bg-padel-statusLive",
      textColor: "text-padel-background",
      borderColor: "",
      animate: true
    },
    next: {
      text: "NEXT UP",
      bgColor: "bg-padel-statusNext/90",
      textColor: "text-padel-background",
      borderColor: "",
      animate: false
    },
    completed: {
      text: "✓ DONE",
      bgColor: "bg-padel-statusCompleted/10",
      textColor: "text-padel-statusCompleted",
      borderColor: "border-padel-statusCompleted/30",
      animate: false
    },
    pending: {
      text: "PENDING",
      bgColor: "bg-padel-statusPending/20",
      textColor: "text-padel-statusPending",
      borderColor: "border-padel-statusPending/30",
      animate: false
    }
  };

  const badge = badges[status];

  return (
    <span
      className={`
        text-[10px] px-3 py-1 rounded-md font-extrabold uppercase tracking-wider
        ${badge.bgColor} ${badge.textColor} ${badge.borderColor ? `border ${badge.borderColor}` : ""}
        ${badge.animate ? "animate-pulse-soft shadow-lg shadow-padel-statusLive/30" : ""}
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
        rounded-xl border px-3 py-3 sm:px-5 sm:py-5
        transition-all duration-200
        ${status === "live" ? "bg-slate-800/90 border-padel-statusLive/60 shadow-lg shadow-padel-statusLive/20" : ""}
        ${status === "next" ? "bg-slate-800/80 border-padel-statusNext/50 shadow-md" : ""}
        ${status === "completed" ? "bg-slate-800/50 border-padel-border/40 opacity-90" : ""}
        ${status === "pending" ? "bg-slate-800/70 border-padel-border/50" : ""}
        hover:scale-[1.02] hover:shadow-xl hover:border-opacity-80
        animate-scale-in
      `}
    >
      {/* Header: Status */}
      <div className="flex items-center justify-end mb-2 sm:mb-3">{getStatusBadge(status)}</div>

      {/* Teams and Score */}
      <div className="flex items-center gap-2 sm:gap-4">
        {/* Team A */}
        <div className={`flex-1 min-w-0 ${highlightTeamA ? "animate-pulse-soft" : ""}`}>
          <div className="flex flex-col items-center gap-2">
            <TeamAvatar players={teamA} size="md" />
            <div className="w-full text-center">
              <p className="text-[9px] sm:text-[10px] text-padel-muted uppercase tracking-widest mb-1">
                <span>Team A</span>
                {seedA && <span className="text-padel-primary font-bold ml-1.5">{seedA}</span>}
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
                    className={`
                      text-xs sm:text-sm font-bold truncate
                      ${winnerA ? "text-padel-primary" : "text-padel-text"}
                    `}
                  >
                    {player.name}
                  </p>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Score */}
        <div className="flex flex-col items-center justify-center px-3 py-2 sm:px-6 sm:py-3 rounded-lg sm:rounded-xl bg-padel-primary/95 border-2 border-padel-primary shrink-0 shadow-lg">
          {hasScore ? (
            <>
              <div className="flex items-center gap-1.5 sm:gap-3 mb-0.5 sm:mb-1">
                <p className="text-xl sm:text-3xl font-black text-padel-background">{scoreA}</p>
                <span className="text-lg sm:text-2xl text-padel-background/60 font-bold">-</span>
                <p className="text-xl sm:text-3xl font-black text-padel-background">{scoreB}</p>
              </div>
              <p className="text-[8px] sm:text-[9px] uppercase tracking-widest text-padel-background/70 font-bold whitespace-nowrap">
                Court {court} • Set {setNumber}
              </p>
            </>
          ) : (
            <>
              <p className="text-xs sm:text-sm font-bold text-padel-background uppercase">Pending</p>
              <p className="text-[8px] sm:text-[9px] uppercase tracking-widest text-padel-background/70 font-semibold mt-0.5">
                Court {court}
              </p>
            </>
          )}
        </div>

        {/* Team B */}
        <div className={`flex-1 min-w-0 ${highlightTeamB ? "animate-pulse-soft" : ""}`}>
          <div className="flex flex-col items-center gap-2">
            <TeamAvatar players={teamB} size="md" />
            <div className="w-full text-center">
              <p className="text-[9px] sm:text-[10px] text-padel-muted uppercase tracking-widest mb-1">
                {seedB && <span className="text-padel-primary font-bold mr-1.5">{seedB}</span>}
                <span>Team B</span>
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
                    className={`
                      text-xs sm:text-sm font-bold truncate
                      ${winnerB ? "text-padel-primary" : "text-padel-text"}
                    `}
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
