"use client";

import { useEffect, useMemo, useState } from "react";

interface TournamentPayload {
  id: string;
  updatedAt: string;
  players: Array<{ id: string; name: string }>;
  leaderboard: Array<{ name: string; totalPoints: number; rank: number }>;
  rounds: Array<{
    id: string;
    roundNumber: number;
    matches: Array<{
      id: string;
      court: number;
      teamA: [string, string];
      teamB: [string, string];
      scoreA?: number;
      scoreB?: number;
    }>;
  }>;
}

export function LiveTournament({ initial, apiBaseUrl }: { initial: TournamentPayload; apiBaseUrl: string }) {
  const [tournament, setTournament] = useState(initial);

  useEffect(() => {
    const wsBase = apiBaseUrl.replace(/^http/, "ws");
    const socket = new WebSocket(`${wsBase}/ws/tournaments/${initial.id}`);
    socket.onmessage = (event) => {
      const parsed = JSON.parse(event.data);
      if (parsed?.payload?.payload) {
        setTournament(parsed.payload.payload);
      } else if (parsed?.payload) {
        setTournament(parsed.payload);
      }
    };
    return () => socket.close();
  }, [apiBaseUrl, initial.id]);

  const currentRound = useMemo(
    () => [...tournament.rounds].sort((a, b) => b.roundNumber - a.roundNumber)[0],
    [tournament.rounds]
  );

  const sortedRounds = useMemo(
    () => [...tournament.rounds].slice().sort((a, b) => a.roundNumber - b.roundNumber),
    [tournament.rounds]
  );

  const playerNameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const player of tournament.players ?? []) {
      map.set(player.id, player.name);
    }
    return map;
  }, [tournament.players]);

  const formatTeam = (team: [string, string]) =>
    team
      .map((id) => playerNameById.get(id) ?? id)
      .join(" / ");

  return (
    <section className="space-y-10">
      <div className="flex items-center justify-between text-xs text-padel-muted">
        <span className="uppercase tracking-[0.25em] font-semibold">Live Tournament</span>
        <span>Last update: {new Date(tournament.updatedAt).toLocaleString()}</span>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <div className="rounded-2xl bg-padel-surface border border-padel-border p-5">
          <h2 className="text-sm font-bold uppercase tracking-widest text-padel-muted mb-3">Leaderboard</h2>
          <ol className="space-y-2">
            {tournament.leaderboard.map((entry) => (
              <li
                key={`${entry.rank}-${entry.name}`}
                className="flex items-center justify-between text-sm bg-padel-surfaceAlt/60 border border-padel-border/60 rounded-xl px-3 py-2"
              >
                <div className="flex items-center gap-3">
                  <span className="text-xs text-padel-muted font-semibold w-6">#{entry.rank}</span>
                  <span className="font-medium">{entry.name}</span>
                </div>
                <span className="text-padel-primary font-bold">{entry.totalPoints} pts</span>
              </li>
            ))}
          </ol>
        </div>

        <div className="rounded-2xl bg-padel-surface border border-padel-border p-5 relative overflow-hidden">
          <div className="absolute top-0 left-0 h-1 bg-padel-primary w-full opacity-70" />
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-[10px] uppercase tracking-widest text-padel-primary font-bold">
                {currentRound ? `Round ${currentRound.roundNumber}` : "No active round"}
              </p>
              <h2 className="text-lg font-bold mt-1">Current Round</h2>
            </div>
            <div className="px-3 py-1 rounded-full bg-padel-primary/10">
              <span className="text-padel-primary text-xs font-bold uppercase tracking-widest">Live</span>
            </div>
          </div>

          {currentRound ? (
            <ul className="space-y-3">
              {currentRound.matches.map((match) => (
                <li
                  key={match.id}
                  className="bg-padel-surfaceAlt/60 border border-padel-border/60 rounded-xl px-4 py-3 flex flex-col gap-1 text-sm"
                >
                  <div className="flex items-center justify-between text-xs text-padel-muted mb-1">
                    <span className="font-semibold uppercase tracking-widest">Court {match.court}</span>
                    <span>
                      {match.scoreA !== undefined && match.scoreB !== undefined
                        ? `Score: ${match.scoreA}-${match.scoreB}`
                        : "Pending"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex-1 text-center">
                      <p className="text-xs text-padel-muted uppercase tracking-widest">Team A</p>
                      <p className="text-sm font-semibold">{formatTeam(match.teamA)}</p>
                    </div>
                    <span className="px-4 text-padel-muted font-bold italic text-xs">vs</span>
                    <div className="flex-1 text-center">
                      <p className="text-xs text-padel-muted uppercase tracking-widest">Team B</p>
                      <p className="text-sm font-semibold">{formatTeam(match.teamB)}</p>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-padel-muted text-sm">No rounds available yet.</p>
          )}
        </div>
      </div>

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold uppercase tracking-widest text-padel-muted">All Rounds</h2>
          {currentRound ? (
            <span className="text-[11px] px-3 py-1 rounded-full bg-padel-primary/10 text-padel-primary font-semibold uppercase tracking-wide">
              Live: Round {currentRound.roundNumber}
            </span>
          ) : null}
        </div>

        <div className="space-y-4">
          {sortedRounds.map((round) => {
            const isLive = currentRound && round.roundNumber === currentRound.roundNumber;
            return (
              <div
                key={round.id}
                className={`rounded-2xl border px-4 py-3 space-y-3 ${
                  isLive
                    ? "bg-padel-surfaceAlt border-padel-primary"
                    : "bg-padel-surface border-padel-border"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-xs uppercase tracking-widest text-padel-muted">Round {round.roundNumber}</span>
                    {isLive ? (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-padel-primary/10 text-padel-primary font-semibold uppercase tracking-widest">
                        Live
                      </span>
                    ) : null}
                  </div>
                  <span className="text-[11px] text-padel-muted">
                    {round.matches.length} match{round.matches.length === 1 ? "" : "es"}
                  </span>
                </div>

                <ul className="space-y-2">
                  {round.matches.map((match) => (
                    <li
                      key={match.id}
                      className="rounded-xl bg-padel-surfaceAlt/60 border border-padel-border/60 px-3 py-2 text-xs md:text-sm flex flex-col gap-1"
                    >
                      <div className="flex items-center justify-between text-[11px] text-padel-muted">
                        <span className="font-semibold uppercase tracking-widest">Court {match.court}</span>
                        <span>
                          {match.scoreA !== undefined && match.scoreB !== undefined
                            ? `Score: ${match.scoreA}-${match.scoreB}`
                            : "Pending"}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex-1 text-left">
                          <p className="text-[10px] text-padel-muted uppercase tracking-widest">Team A</p>
                          <p className="text-xs md:text-sm font-semibold">{formatTeam(match.teamA)}</p>
                        </div>
                        <span className="px-3 text-padel-muted font-bold italic text-[11px]">vs</span>
                        <div className="flex-1 text-right">
                          <p className="text-[10px] text-padel-muted uppercase tracking-widest">Team B</p>
                          <p className="text-xs md:text-sm font-semibold">{formatTeam(match.teamB)}</p>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      </section>
    </section>
  );
}
