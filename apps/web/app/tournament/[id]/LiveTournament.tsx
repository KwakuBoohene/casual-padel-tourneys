"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { MatchCard } from "./components/MatchCard";
import { isTournamentComplete } from "./components/outstandingPlayers";
import { PlayerSearch } from "./components/PlayerSearch";
import { RoundSection } from "./components/RoundSection";

interface TournamentPayload {
  id: string;
  updatedAt: string;
  players: Array<{ id: string; name: string }>;
  leaderboard: Array<{
    playerId: string;
    name: string;
    totalPoints: number;
    gamesPlayed: number;
    rank: number;
  }>;
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

type MatchStatus = "live" | "next" | "completed" | "pending";

export function LiveTournament({
  initial,
  apiBaseUrl,
  onConnectionChange
}: {
  initial: TournamentPayload;
  apiBaseUrl: string;
  onConnectionChange?: (state: { connected: boolean; lastUpdate: string }) => void;
}) {
  const [tournament, setTournament] = useState(initial);
  const [searchQuery, setSearchQuery] = useState("");
  const [isConnected, setIsConnected] = useState(true);
  const liveRoundRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const wsBase = apiBaseUrl.replace(/^http/, "ws");
    const socket = new WebSocket(`${wsBase}/ws/tournaments/${initial.id}`);

    socket.onopen = () => {
      setIsConnected(true);
      onConnectionChange?.({ connected: true, lastUpdate: tournament.updatedAt });
    };

    socket.onclose = () => {
      setIsConnected(false);
      onConnectionChange?.({ connected: false, lastUpdate: tournament.updatedAt });
    };

    socket.onerror = () => {
      setIsConnected(false);
      onConnectionChange?.({ connected: false, lastUpdate: tournament.updatedAt });
    };

    socket.onmessage = (event) => {
      const parsed = JSON.parse(event.data);
      let newTournament: TournamentPayload | null = null;

      if (parsed?.payload?.payload) {
        newTournament = parsed.payload.payload;
      } else if (parsed?.payload) {
        newTournament = parsed.payload;
      }

      if (newTournament) {
        setTournament(newTournament);
        onConnectionChange?.({ connected: true, lastUpdate: newTournament.updatedAt });
      }
    };

    return () => socket.close();
  }, [apiBaseUrl, initial.id, onConnectionChange]);

  // Create player lookup maps
  const playerById = useMemo(() => {
    const map = new Map<string, { id: string; name: string }>();
    for (const player of tournament.players ?? []) {
      map.set(player.id, player);
    }
    return map;
  }, [tournament.players]);

  // Determine current round (highest round with any match having a score)
  const currentRoundNumber = useMemo(() => {
    const roundsWithScores = tournament.rounds.filter((round) =>
      round.matches.some((match) => match.scoreA !== undefined || match.scoreB !== undefined)
    );
    if (roundsWithScores.length === 0) return 1;
    return Math.max(...roundsWithScores.map((r) => r.roundNumber));
  }, [tournament.rounds]);

  // Get match status
  const getMatchStatus = (match: any, roundNumber: number): MatchStatus => {
    const hasScore = match.scoreA !== undefined && match.scoreB !== undefined;
    if (hasScore) return "completed";
    if (roundNumber === currentRoundNumber) return "live";
    if (roundNumber === currentRoundNumber + 1) return "next";
    return "pending";
  };

  // Filter matches by search query
  const matchesPlayerQuery = (match: any) => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    const teamAPlayers = match.teamA.map((id: string) => playerById.get(id)?.name.toLowerCase() || "");
    const teamBPlayers = match.teamB.map((id: string) => playerById.get(id)?.name.toLowerCase() || "");
    return [...teamAPlayers, ...teamBPlayers].some((name) => name.includes(query));
  };

  // Get highlighted player IDs from search
  const highlightedPlayerIds = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const query = searchQuery.toLowerCase();
    return tournament.players.filter((p) => p.name.toLowerCase().includes(query)).map((p) => p.id);
  }, [searchQuery, tournament.players]);

  const tournamentComplete = useMemo(() => isTournamentComplete(tournament), [tournament]);

  // Organize rounds into current, previous, and upcoming
  const { currentRound, previousRounds, upcomingRounds } = useMemo(() => {
    const sorted = [...tournament.rounds].sort((a, b) => a.roundNumber - b.roundNumber);
    const current = sorted.find((r) => r.roundNumber === currentRoundNumber);
    const previous = sorted.filter((r) => r.roundNumber < currentRoundNumber);
    const upcoming = sorted.filter((r) => r.roundNumber > currentRoundNumber);
    return { currentRound: current, previousRounds: previous, upcomingRounds: upcoming };
  }, [tournament.rounds, currentRoundNumber]);

  // Count filtered matches
  const filteredMatchCount = useMemo(() => {
    return tournament.rounds.reduce((count, round) => {
      return count + round.matches.filter(matchesPlayerQuery).length;
    }, 0);
  }, [tournament.rounds, searchQuery]);

  const totalMatchCount = useMemo(() => {
    return tournament.rounds.reduce((count, round) => count + round.matches.length, 0);
  }, [tournament.rounds]);

  // Convert player IDs to player objects
  const getPlayerObjects = (playerIds: [string, string]) => {
    return playerIds.map((id) => playerById.get(id) || { id, name: id });
  };

  // Count completed matches in a round
  const getCompletedMatchCount = (round: any) => {
    return round.matches.filter((m: any) => m.scoreA !== undefined && m.scoreB !== undefined).length;
  };

  return (
    <section className="space-y-6">
      {tournamentComplete ? (
        <div className="rounded-xl border border-padel-primary/40 bg-padel-primary/10 p-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <p className="text-sm font-semibold text-padel-text">
              Tournament completed. View the final standings on the leaderboard.
            </p>
            <Link
              href={`/tournament/${tournament.id}/leaderboard`}
              className="inline-flex items-center justify-center rounded-full bg-padel-primary px-4 py-2 text-sm font-semibold text-white transition hover:bg-padel-primary/90"
            >
              Go to leaderboard
            </Link>
          </div>
        </div>
      ) : null}

      {/* Player Search */}
      <PlayerSearch
        value={searchQuery}
        onChange={setSearchQuery}
        matchCount={filteredMatchCount}
        totalMatches={totalMatchCount}
      />

      {/* Current Live Round */}
      {currentRound &&
        (() => {
          const filteredMatches = currentRound.matches.filter(matchesPlayerQuery);
          if (filteredMatches.length === 0 && searchQuery) return null;

          return (
            <div ref={liveRoundRef} className="scroll-mt-6">
              <RoundSection
                title={`Round ${currentRound.roundNumber}`}
                roundNumber={currentRound.roundNumber}
                matchCount={currentRound.matches.length}
                completedMatches={getCompletedMatchCount(currentRound)}
                isLive={true}
                isCollapsible={false}
              >
                <div className="space-y-3">
                  {filteredMatches.map((match) => (
                    <MatchCard
                      key={match.id}
                      court={match.court}
                      teamA={getPlayerObjects(match.teamA)}
                      teamB={getPlayerObjects(match.teamB)}
                      scoreA={match.scoreA}
                      scoreB={match.scoreB}
                      status={getMatchStatus(match, currentRound.roundNumber)}
                      highlightPlayers={highlightedPlayerIds}
                    />
                  ))}
                </div>
              </RoundSection>
            </div>
          );
        })()}

      {/* Upcoming Rounds */}
      {upcomingRounds.length > 0 &&
        (() => {
          const hasAnyMatches = upcomingRounds.some(
            (round) => round.matches.filter(matchesPlayerQuery).length > 0
          );
          if (!hasAnyMatches && searchQuery) return null;

          return (
            <div className="space-y-3">
              <h3 className="text-sm font-bold uppercase tracking-widest text-padel-primary px-1 flex items-center gap-2">
                <span className="h-1 w-1 rounded-full bg-padel-primary animate-pulse-soft"></span>
                Upcoming Rounds
              </h3>
              <div className="space-y-3">
                {upcomingRounds.map((round) => {
                  const filteredMatches = round.matches.filter(matchesPlayerQuery);
                  if (filteredMatches.length === 0 && searchQuery) return null;

                  return (
                    <RoundSection
                      key={round.id}
                      title={`Round ${round.roundNumber}`}
                      roundNumber={round.roundNumber}
                      matchCount={round.matches.length}
                      completedMatches={getCompletedMatchCount(round)}
                      isLive={false}
                      isCollapsible={true}
                      defaultExpanded={searchQuery.trim() !== ""}
                    >
                      <div className="space-y-3">
                        {filteredMatches.map((match) => (
                          <MatchCard
                            key={match.id}
                            court={match.court}
                            teamA={getPlayerObjects(match.teamA)}
                            teamB={getPlayerObjects(match.teamB)}
                            scoreA={match.scoreA}
                            scoreB={match.scoreB}
                            status={getMatchStatus(match, round.roundNumber)}
                            highlightPlayers={highlightedPlayerIds}
                          />
                        ))}
                      </div>
                    </RoundSection>
                  );
                })}
              </div>
            </div>
          );
        })()}

      {/* Previous Rounds */}
      {previousRounds.length > 0 &&
        (() => {
          const hasAnyMatches = previousRounds.some(
            (round) => round.matches.filter(matchesPlayerQuery).length > 0
          );
          if (!hasAnyMatches && searchQuery) return null;

          return (
            <div className="space-y-3">
              <h3 className="text-sm font-bold uppercase tracking-widest text-padel-muted/60 px-1 flex items-center gap-2">
                <span className="h-1 w-1 rounded-full bg-padel-status-completed"></span>
                Previous Rounds
              </h3>
              <div className="space-y-3">
                {previousRounds.reverse().map((round) => {
                  const filteredMatches = round.matches.filter(matchesPlayerQuery);
                  if (filteredMatches.length === 0 && searchQuery) return null;

                  return (
                    <RoundSection
                      key={round.id}
                      title={`Round ${round.roundNumber}`}
                      roundNumber={round.roundNumber}
                      matchCount={round.matches.length}
                      completedMatches={getCompletedMatchCount(round)}
                      isLive={false}
                      isCollapsible={true}
                      defaultExpanded={searchQuery.trim() !== ""}
                    >
                      <div className="space-y-3">
                        {filteredMatches.map((match) => (
                          <MatchCard
                            key={match.id}
                            court={match.court}
                            teamA={getPlayerObjects(match.teamA)}
                            teamB={getPlayerObjects(match.teamB)}
                            scoreA={match.scoreA}
                            scoreB={match.scoreB}
                            status={getMatchStatus(match, round.roundNumber)}
                            highlightPlayers={highlightedPlayerIds}
                          />
                        ))}
                      </div>
                    </RoundSection>
                  );
                })}
              </div>
            </div>
          );
        })()}

      {/* No matches found message */}
      {searchQuery && filteredMatchCount === 0 && (
        <div className="flex flex-col items-center justify-center py-20 px-4">
          <div className="text-center space-y-4 max-w-md">
            <div className="text-6xl">🔍</div>
            <h3 className="text-lg font-bold text-padel-text">No matches found</h3>
            <p className="text-sm text-padel-muted">
              No matches found for <span className="text-padel-primary font-semibold">"{searchQuery}"</span>
            </p>
            <p className="text-xs text-padel-muted/60">Try searching with a different player name</p>
          </div>
        </div>
      )}
    </section>
  );
}
