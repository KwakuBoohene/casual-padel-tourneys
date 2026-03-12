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
      <div className="flex items-center justify-between text-xs text-slate-400">
        <span className="uppercase tracking-[0.25em] font-semibold">Live Tournament</span>
        <span>Last update: {new Date(tournament.updatedAt).toLocaleString()}</span>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl bg-slate-800/70 border border-white/10 p-5">
          <h2 className="text-sm font-bold uppercase tracking-widest text-slate-400 mb-3">Leaderboard</h2>
          <ol className="space-y-2">
            {tournament.leaderboard.map((entry) => (
              <li
                key={`${entry.rank}-${entry.name}`}
                className="flex items-center justify-between text-sm bg-slate-900/40 rounded-xl px-3 py-2"
              >
                <div className="flex items-center gap-3">
                  <span className="text-xs text-slate-500 font-semibold w-6">#{entry.rank}</span>
                  <span className="font-medium">{entry.name}</span>
                </div>
                <span className="text-padel-green font-bold">{entry.totalPoints} pts</span>
              </li>
            ))}
          </ol>
        </div>

        <div className="rounded-2xl bg-slate-800/70 border border-white/10 p-5 relative overflow-hidden">
          <div className="absolute top-0 left-0 h-1 bg-padel-green w-full opacity-70" />
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-[10px] uppercase tracking-widest text-padel-green font-bold">
                {currentRound ? `Round ${currentRound.roundNumber}` : "No active round"}
              </p>
              <h2 className="text-lg font-bold mt-1">Current Round</h2>
            </div>
            <div className="px-3 py-1 rounded-full bg-padel-green/10">
              <span className="text-padel-green text-xs font-bold uppercase tracking-widest">Live</span>
            </div>
          </div>

          {currentRound ? (
            <ul className="space-y-3">
              {currentRound.matches.map((match) => (
                <li
                  key={match.id}
                  className="bg-slate-900/40 border border-white/10 rounded-xl px-4 py-3 flex flex-col gap-1 text-sm"
                >
                  <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
                    <span className="font-semibold uppercase tracking-widest">Court {match.court}</span>
                    <span>
                      {match.scoreA !== undefined && match.scoreB !== undefined
                        ? `Score: ${match.scoreA}-${match.scoreB}`
                        : "Pending"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex-1 text-center">
                      <p className="text-xs text-slate-400 uppercase tracking-widest">Team A</p>
                      <p className="text-sm font-semibold">{formatTeam(match.teamA)}</p>
                    </div>
                    <span className="px-4 text-slate-500 font-bold italic text-xs">vs</span>
                    <div className="flex-1 text-center">
                      <p className="text-xs text-slate-400 uppercase tracking-widest">Team B</p>
                      <p className="text-sm font-semibold">{formatTeam(match.teamB)}</p>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-slate-400 text-sm">No rounds available yet.</p>
          )}
        </div>
      </div>
    </section>
  );
}
