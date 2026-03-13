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
    <section className="space-y-8">
      <div className="flex items-center justify-between text-xs text-padel-muted">
        <span className="uppercase tracking-[0.25em] font-semibold">Live Tournament</span>
        <span>Last update: {new Date(tournament.updatedAt).toLocaleString()}</span>
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
                className={`rounded-2xl border px-4 py-4 space-y-3 ${
                  isLive ? "bg-padel-surfaceAlt border-padel-primary" : "bg-padel-surface border-padel-border"
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
                      className="rounded-xl bg-padel-surfaceAlt/80 border border-padel-border/80 px-3 py-3 text-xs md:text-sm flex flex-col gap-2"
                    >
                      <div className="flex items-center justify-between text-[11px] text-padel-muted">
                        <span className="font-semibold uppercase tracking-widest">Court {match.court}</span>
                      </div>
                      <div className="flex items-center justify-between gap-3 md:gap-4">
                        <div className="flex-1 text-left">
                          <p className="text-[10px] text-padel-muted uppercase tracking-widest">Team A</p>
                          <p className="text-xs md:text-sm font-semibold">{formatTeam(match.teamA)}</p>
                        </div>
                        <div className="flex flex-col items-center justify-center px-3 py-1 rounded-xl bg-padel-surface border border-padel-border min-w-[72px]">
                          {match.scoreA !== undefined && match.scoreB !== undefined ? (
                            <>
                              <p className="text-[10px] uppercase tracking-widest text-padel-muted mb-0.5">Score</p>
                              <p className="text-base md:text-lg font-extrabold text-padel-primary">
                                {match.scoreA}
                                <span className="mx-1 text-padel-muted">-</span>
                                {match.scoreB}
                              </p>
                            </>
                          ) : (
                            <p className="text-[11px] font-semibold text-padel-muted">Pending</p>
                          )}
                        </div>
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
