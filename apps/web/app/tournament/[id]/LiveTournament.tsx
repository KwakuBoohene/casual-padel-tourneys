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
    <section>
      <p>Last update: {new Date(tournament.updatedAt).toLocaleString()}</p>
      <h2>Leaderboard</h2>
      <ol>
        {tournament.leaderboard.map((entry) => (
          <li key={`${entry.rank}-${entry.name}`}>
            {entry.name}: {entry.totalPoints} pts
          </li>
        ))}
      </ol>
      <h2>Current Round</h2>
      {currentRound ? (
        <ul>
          {currentRound.matches.map((match) => (
            <li key={match.id}>
              Court {match.court}: [{formatTeam(match.teamA)}] vs [{formatTeam(match.teamB)}]{" "}
              {match.scoreA !== undefined && match.scoreB !== undefined ? `(${match.scoreA}-${match.scoreB})` : "(pending)"}
            </li>
          ))}
        </ul>
      ) : (
        <p>No rounds available yet.</p>
      )}
    </section>
  );
}
