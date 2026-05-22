"use client";

import Link from "next/link";
import type { OutstandingPlayerRow } from "./outstandingPlayers";

type PodiumStyle = {
  shortLabel: string;
  rankTextClass: string;
  listAccentClass: string;
  medalColor: string;
  podiumClass: string;
  avatarClass: string;
  podiumHeightClass: string;
  chipClass: string;
};

const podiumStyles: Record<number, PodiumStyle> = {
  1: {
    shortLabel: "1st",
    rankTextClass: "text-[#e9c400]",
    listAccentClass: "before:bg-[#e9c400]",
    medalColor: "#e9c400",
    podiumClass: "border-[#d8c980] bg-[#e8e1be]",
    avatarClass: "bg-[#123d66] text-[#d7ecff]",
    podiumHeightClass: "h-40 md:h-44",
    chipClass: "bg-[#f1e9c7] text-[#8f7400]"
  },
  2: {
    shortLabel: "2nd",
    rankTextClass: "text-[#c0c6d8]",
    listAccentClass: "before:bg-[#c0c6d8]",
    medalColor: "#9ca3af",
    podiumClass: "border-[#d6d2d6] bg-[#e2dfe2]",
    avatarClass: "bg-[#38a169] text-[#dcfce7]",
    podiumHeightClass: "h-32 md:h-36",
    chipClass: "bg-[#e8ecf2] text-[#637186]"
  },
  3: {
    shortLabel: "3rd",
    rankTextClass: "text-[#cd7f32]",
    listAccentClass: "before:bg-[#cd7f32]",
    medalColor: "#cd7f32",
    podiumClass: "border-[#e2c8a8] bg-[#ead7c2]",
    avatarClass: "bg-[#b8a71a] text-[#fff7d1]",
    podiumHeightClass: "h-28 md:h-32",
    chipClass: "bg-[#f3e2cf] text-[#9d6930]"
  }
};

function initialsFromName(name: string) {
  const tokens = name.trim().split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return "?";
  if (tokens.length === 1) return tokens[0].slice(0, 2).toUpperCase();
  return `${tokens[0][0] ?? ""}${tokens[1][0] ?? ""}`.toUpperCase();
}

function truncateName(name: string, maxLength = 13) {
  if (name.length <= maxLength) return name;
  return `${name.slice(0, maxLength - 3)}...`;
}

function formatDiff(diff: number) {
  return diff > 0 ? `+${diff}` : `${diff}`;
}

function MedalIcon({ rank, color }: { rank: number; color: string }) {
  if (rank === 1) {
    return (
      <svg viewBox="0 0 24 24" fill="none" className="h-8 w-8" aria-hidden="true">
        <path d="M6 5h12v3c0 2.8-2.2 5-5 5h-2c-2.8 0-5-2.2-5-5V5Z" fill={color} />
        <path d="M9.5 13h5v2.2c0 .9.4 1.7 1 2.3l1.5 1.5H7l1.5-1.5c.6-.6 1-1.4 1-2.3V13Z" fill={color} />
        <path d="M8 6H5v1a3 3 0 0 0 3 3" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
        <path d="M16 6h3v1a3 3 0 0 1-3 3" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-8 w-8" aria-hidden="true">
      <circle cx="12" cy="13" r="5" fill={color} />
      <path d="M9 3.5h2.1l.9 3H9.8L9 3.5Zm6 0h-2.1l-.9 3h2.2l.8-3Z" fill={color} />
      <path d="M12 10.4l.8 1.6 1.8.2-1.3 1.2.4 1.8-1.7-.9-1.7.9.4-1.8-1.3-1.2 1.8-.2.8-1.6Z" fill="white" />
    </svg>
  );
}

export function OutstandingPlayersPodium({
  players,
  title = "Outstanding Players",
  leaderboardHref,
  ctaLabel = "View full leaderboard"
}: {
  players: OutstandingPlayerRow[];
  title?: string;
  leaderboardHref?: string;
  ctaLabel?: string;
}) {
  if (players.length === 0) return null;

  const winner = players.find((player) => player.rank === 1) ?? players[0];
  const winnerDiff = winner ? winner.wins - winner.losses : 0;
  const podiumPlayers = [2, 1, 3]
    .map((rank) => players.find((player) => player.rank === rank))
    .filter((player): player is OutstandingPlayerRow => Boolean(player));

  return (
    <section className="mb-6 rounded-2xl border border-padel-border bg-[#f1f3f7] p-5 text-[#262626]">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="text-sm font-bold uppercase tracking-widest text-padel-muted">{title}</h2>
        <span className="text-xs uppercase tracking-[0.2em] text-[#5f6470]">Top 3</span>
      </div>

      {winner ? (
        <div className="mb-5 text-center">
          <div className="mx-auto mb-2 flex h-20 w-20 items-center justify-center rounded-full bg-[#e9eef8]">
            <svg viewBox="0 0 24 24" fill="none" className="h-12 w-12 text-[#e9c400]" aria-hidden="true">
              <path
                d="M6 5h12v3c0 2.8-2.2 5-5 5h-2c-2.8 0-5-2.2-5-5V5Zm3.5 8h5v2.2c0 .9.4 1.7 1 2.3l1.5 1.5H7l1.5-1.5c.6-.6 1-1.4 1-2.3V13Z"
                fill="currentColor"
              />
              <path
                d="M8 6H5v1a3 3 0 0 0 3 3m8-4h3v1a3 3 0 0 1-3 3"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            </svg>
          </div>
          <h3 className="text-[32px] leading-tight font-semibold tracking-tight text-[#222733]">
            Well played {winner.name}!
          </h3>
          <p className="mt-1 text-base text-[#555f73]">You have been awarded the winner trophy</p>

          <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
            <span className="rounded-full bg-[#d9efdc] px-4 py-2 text-sm font-semibold text-[#3f9f57]">
              Wins {winner.wins}
            </span>
            <span className="rounded-full bg-[#dce8ff] px-4 py-2 text-sm font-semibold text-[#3d68ce]">
              Points {winner.totalPoints}
            </span>
            <span className="rounded-full bg-[#f5e8cd] px-4 py-2 text-sm font-semibold text-[#c28a22]">
              Diff {formatDiff(winnerDiff)}
            </span>
          </div>
        </div>
      ) : null}

      <div className="grid grid-cols-3 items-end gap-3 md:gap-8">
        {podiumPlayers.map((player) => {
          const podium = podiumStyles[player.rank];
          return (
            <article key={player.playerId} className="flex min-w-0 flex-col items-center">
              <div
                className={`mb-2 flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold md:h-12 md:w-12 md:text-base ${podium.avatarClass}`}
                aria-label={`${player.name} avatar`}
              >
                {initialsFromName(player.name)}
              </div>
              <p className="mb-2 max-w-full truncate px-1 text-center text-xs font-medium text-[#2e3340] md:text-sm">
                {truncateName(player.name)}
              </p>
              <div
                className={`flex w-full max-w-33 flex-col items-center justify-center rounded-t-3xl border ${podium.podiumClass} ${podium.podiumHeightClass}`}
              >
                <MedalIcon rank={player.rank} color={podium.medalColor} />
                <p className="mt-1 text-4xl leading-none font-semibold text-[#2b2b2b]">{player.rank}</p>
                <span className={`mt-2 rounded-full px-2 py-1 text-[10px] font-semibold ${podium.chipClass}`}>
                  {podium.shortLabel}
                </span>
              </div>
            </article>
          );
        })}
      </div>

      {leaderboardHref ? (
        <div className="mt-5 flex justify-center">
          <Link
            href={leaderboardHref}
            className="inline-flex items-center gap-2 rounded-full bg-[#111827] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#1f2937]"
          >
            <span aria-hidden="true">↗</span>
            {ctaLabel}
          </Link>
        </div>
      ) : null}
    </section>
  );
}
