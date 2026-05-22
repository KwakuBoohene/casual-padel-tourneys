type PodiumPlayer = {
  playerId: string;
  name: string;
  totalPoints: number;
  rank: number;
  wins: number;
  losses: number;
  draws: number;
};

type PodiumStyle = {
  label: string;
  icon: string;
  rankTextClass: string;
  badgeClass: string;
  podiumFillClass: string;
  accentColor: string;
  listAccentClass: string;
};

export const podiumStyles: Record<number, PodiumStyle> = {
  1: {
    label: "Gold",
    icon: "🏆",
    rankTextClass: "text-[#e9c400]",
    badgeClass: "bg-[#fff2b8] text-[#9b7d00]",
    podiumFillClass: "bg-[#ebe5be]",
    accentColor: "#e1b900",
    listAccentClass: "before:bg-[#e9c400]"
  },
  2: {
    label: "Silver",
    icon: "🥈",
    rankTextClass: "text-[#c0c6d8]",
    badgeClass: "bg-[#e8f1e8] text-[#4b9b5f]",
    podiumFillClass: "bg-[#ddd9dd]",
    accentColor: "#b8b8b8",
    listAccentClass: "before:bg-[#c0c6d8]"
  },
  3: {
    label: "Bronze",
    icon: "🥉",
    rankTextClass: "text-[#cd7f32]",
    badgeClass: "bg-[#f1e4c6] text-[#b67631]",
    podiumFillClass: "bg-[#e8d0b3]",
    accentColor: "#ca7b2f",
    listAccentClass: "before:bg-[#cd7f32]"
  }
};

function initialsFromName(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

function shortName(name: string): string {
  const parts = name.split(" ").filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0]} ${parts[1][0]}.`;
  }
  return name;
}

function TrophyIcon({ color, className = "h-10 w-10" }: { color: string; className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden="true">
      <path d="M20 8h24v8c0 7-5 13-12 13s-12-6-12-13V8Z" fill={color} />
      <path
        d="M20 12H10v2c0 6 5 11 11 11h2"
        fill="none"
        stroke={color}
        strokeWidth="3"
        strokeLinecap="round"
      />
      <path
        d="M44 12h10v2c0 6-5 11-11 11h-2"
        fill="none"
        stroke={color}
        strokeWidth="3"
        strokeLinecap="round"
      />
      <rect x="28" y="29" width="8" height="11" rx="2" fill={color} />
      <rect x="22" y="40" width="20" height="6" rx="2" fill={color} />
      <rect x="18" y="48" width="28" height="6" rx="2" fill={color} />
    </svg>
  );
}

function MedalIcon({ color, className = "h-10 w-10" }: { color: string; className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden="true">
      <path d="M18 6h10l4 16H22L18 6Z" fill="#6a7eab" />
      <path d="M36 6h10l-4 16H32L36 6Z" fill="#4b628f" />
      <circle cx="32" cy="38" r="16" fill={color} stroke="#1f2937" strokeWidth="1.5" />
      <circle cx="32" cy="38" r="11" fill="none" stroke="rgba(255,255,255,0.45)" strokeWidth="2" />
      <path
        d="M32 31l2.1 4.3 4.7.7-3.4 3.4.8 4.7-4.2-2.2-4.2 2.2.8-4.7-3.4-3.4 4.7-.7L32 31Z"
        fill="rgba(255,255,255,0.9)"
      />
    </svg>
  );
}

export function PodiumAwardIcon({
  rank,
  color,
  className = "h-10 w-10"
}: {
  rank: number;
  color: string;
  className?: string;
}) {
  if (rank === 1) {
    return <TrophyIcon color={color} className={className} />;
  }
  return <MedalIcon color={color} className={className} />;
}

function HeroAwardIcon({ color }: { color: string }) {
  return (
    <svg viewBox="0 0 64 64" className="h-12 w-12" aria-hidden="true">
      <path d="M20 8h24v8c0 7-5 13-12 13s-12-6-12-13V8Z" fill={color} />
      <path
        d="M20 12H10v2c0 6 5 11 11 11h2"
        fill="none"
        stroke={color}
        strokeWidth="3"
        strokeLinecap="round"
      />
      <path
        d="M44 12h10v2c0 6-5 11-11 11h-2"
        fill="none"
        stroke={color}
        strokeWidth="3"
        strokeLinecap="round"
      />
      <rect x="28" y="29" width="8" height="11" rx="2" fill={color} />
      <rect x="22" y="40" width="20" height="6" rx="2" fill={color} />
      <rect x="18" y="48" width="28" height="6" rx="2" fill={color} />
    </svg>
  );
}

export default function PodiumShowcase({ players }: { players: PodiumPlayer[] }) {
  const champion = players.find((player) => player.rank === 1);
  const runnerUp = players.find((player) => player.rank === 2);
  const thirdPlace = players.find((player) => player.rank === 3);
  const podiumOrder = [runnerUp, champion, thirdPlace].filter((entry): entry is PodiumPlayer =>
    Boolean(entry)
  );

  if (players.length === 0) {
    return null;
  }

  return (
    <section className="mb-6 rounded-3xl border border-black/5 bg-[#f3f4f6] p-5 text-slate-800 md:p-7">
      <div className="mx-auto mb-6 max-w-md text-center">
        <div className="mx-auto mb-3 flex h-20 w-20 items-center justify-center rounded-full bg-[#dbe5ef]">
          <HeroAwardIcon color={podiumStyles[1].accentColor} />
        </div>
        <h2 className="text-3xl font-bold tracking-tight">Well played {champion?.name ?? "Champion"}!</h2>
        <p className="mt-1 text-sm text-slate-600">You have been awarded the winner trophy</p>
      </div>

      <div className="mb-8 grid gap-2 sm:grid-cols-3">
        <div className={`rounded-full px-4 py-2 text-center text-xl font-bold ${podiumStyles[2].badgeClass}`}>
          Wins {champion?.wins ?? 0}
        </div>
        <div className="rounded-full px-4 py-2 text-center text-xl font-bold bg-[#dce6fd] text-[#3d67db]">
          Points {champion?.totalPoints ?? 0}
        </div>
        <div className={`rounded-full px-4 py-2 text-center text-xl font-bold ${podiumStyles[1].badgeClass}`}>
          Diff {(champion?.wins ?? 0) - (champion?.losses ?? 0) >= 0 ? "+" : ""}
          {(champion?.wins ?? 0) - (champion?.losses ?? 0)}
        </div>
      </div>

      <div className="grid grid-cols-3 items-end gap-3">
        {podiumOrder.map((player) => {
          const podium = podiumStyles[player.rank];
          const isChampion = player.rank === 1;

          return (
            <article key={player.playerId} className="text-center">
              <div className="mx-auto mb-2 flex h-11 w-11 items-center justify-center rounded-full bg-[#103d6f] text-sm font-bold text-white">
                {initialsFromName(player.name)}
              </div>
              <p className="mb-3 truncate px-1 text-lg font-medium text-slate-800">
                {shortName(player.name)}
              </p>
              <div
                className={`mx-auto flex w-full max-w-[160px] flex-col items-center justify-between rounded-t-3xl px-3 pb-4 pt-5 ${podium.podiumFillClass} ${isChampion ? "h-40" : "h-32"}`}
              >
                <PodiumAwardIcon rank={player.rank} color={podium.accentColor} />
                <p className="text-4xl font-semibold text-slate-800">{player.rank}</p>
              </div>
              <p className="mt-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                {podium.label}
              </p>
            </article>
          );
        })}
      </div>
    </section>
  );
}

export type { PodiumPlayer };
