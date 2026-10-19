"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { MatchCard } from "./components/MatchCard";
import { MexicanoStandingsStrip } from "./components/MexicanoStandingsStrip";
import { isTournamentComplete } from "./components/outstandingPlayers";
import { PlayerSearch } from "./components/PlayerSearch";
import { RoundSection } from "./components/RoundSection";
import {
  isMatchComplete,
  isMatchResolved,
  isMatchVoided,
  isMexicanoMode,
  matchHasProgress,
  type TournamentViewModel
} from "./types";

type MatchStatus = "live" | "next" | "completed" | "pending" | "void";

export function LiveTournament({
  initial,
  token,
  apiBaseUrl,
  onConnectionChange,
  onRoundChange
}: {
  initial: TournamentViewModel;
  token: string;
  apiBaseUrl: string;
  onConnectionChange?: (state: { connected: boolean; lastUpdate: string }) => void;
  onRoundChange?: (roundNumber: number) => void;
}) {
  const [tournament, setTournament] = useState(initial);
  const [searchQuery, setSearchQuery] = useState("");
  const [isConnected, setIsConnected] = useState(true);
  const scoringMode = tournament.config.scoringMode;
  const isMexicano = isMexicanoMode(String(tournament.config.mode));

  useEffect(() => {
    const wsBase = apiBaseUrl.replace(/^http/, "ws");
    const socket = new WebSocket(
      `${wsBase}/ws/tournaments/${initial.id}?token=${encodeURIComponent(token)}`
    );

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
      let newTournament: TournamentViewModel | null = null;

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
  }, [apiBaseUrl, initial.id, token, onConnectionChange]);

  const playerById = useMemo(() => {
    const map = new Map<string, { id: string; name: string }>();
    for (const player of tournament.players ?? []) {
      map.set(player.id, player);
    }
    return map;
  }, [tournament.players]);

  const currentRoundNumber = useMemo(() => {
    const sorted = [...tournament.rounds].sort((a, b) => a.roundNumber - b.roundNumber);
    if (sorted.length === 0) return 1;

    if (isMexicano) {
      // Prefer the first unresolved round (newly generated next round), else latest.
      // Voided matches count as resolved, or a closed night would stick on an abandoned round.
      const incomplete = sorted.find((round) =>
        round.matches.some((match) => !isMatchResolved(match))
      );
      return (incomplete ?? sorted[sorted.length - 1]).roundNumber;
    }

    const roundsWithProgress = sorted.filter((round) =>
      round.matches.some((match) => matchHasProgress(match))
    );
    if (roundsWithProgress.length === 0) return sorted[0].roundNumber;
    return Math.max(...roundsWithProgress.map((r) => r.roundNumber));
  }, [tournament.rounds, isMexicano]);

  useEffect(() => {
    onRoundChange?.(currentRoundNumber);
  }, [currentRoundNumber, onRoundChange]);

  const getMatchStatus = (
    match: TournamentViewModel["rounds"][number]["matches"][number],
    roundNumber: number
  ): MatchStatus => {
    // Void first: an abandoned match must never read as live or next.
    if (isMatchVoided(match)) return "void";
    if (isMatchComplete(match)) return "completed";
    if (roundNumber === currentRoundNumber) return "live";
    if (isMexicano) return "pending";
    if (roundNumber === currentRoundNumber + 1) return "next";
    return "pending";
  };

  const matchesPlayerQuery = (match: TournamentViewModel["rounds"][number]["matches"][number]) => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    const names = [...match.teamA, ...match.teamB].map(
      (id) => playerById.get(id)?.name.toLowerCase() || ""
    );
    return names.some((name) => name.includes(query));
  };

  const highlightedPlayerIds = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const query = searchQuery.toLowerCase();
    return tournament.players.filter((p) => p.name.toLowerCase().includes(query)).map((p) => p.id);
  }, [searchQuery, tournament.players]);

  const tournamentComplete = useMemo(() => isTournamentComplete(tournament), [tournament]);

  const { currentRound, previousRounds, upcomingRounds } = useMemo(() => {
    const sorted = [...tournament.rounds].sort((a, b) => a.roundNumber - b.roundNumber);
    const upcoming = sorted.filter((r) => r.roundNumber > currentRoundNumber);
    return {
      currentRound: sorted.find((r) => r.roundNumber === currentRoundNumber),
      previousRounds: sorted.filter((r) => r.roundNumber < currentRoundNumber),
      // Mexicano: only show already-generated future rounds (rare while viewing an older incomplete).
      upcomingRounds: isMexicano ? upcoming.slice(0, 1) : upcoming
    };
  }, [tournament.rounds, currentRoundNumber, isMexicano]);

  const waitingForNextRound = useMemo(() => {
    if (!isMexicano || tournamentComplete) return false;
    const current = currentRound;
    if (!current || current.matches.length === 0) return false;
    return current.matches.every((match) => isMatchComplete(match)) && upcomingRounds.length === 0;
  }, [isMexicano, tournamentComplete, currentRound, upcomingRounds.length]);

  const filteredMatchCount = useMemo(
    () =>
      tournament.rounds.reduce(
        (count, round) => count + round.matches.filter(matchesPlayerQuery).length,
        0
      ),
    [tournament.rounds, searchQuery, playerById]
  );

  const totalMatchCount = useMemo(
    () => tournament.rounds.reduce((count, round) => count + round.matches.length, 0),
    [tournament.rounds]
  );

  const getPlayerObjects = (playerIds: [string, string]) =>
    playerIds.map((id) => playerById.get(id) || { id, name: id });

  const getCompletedMatchCount = (round: TournamentViewModel["rounds"][number]) =>
    round.matches.filter((match) => isMatchComplete(match)).length;

  const renderMatchGrid = (
    matches: TournamentViewModel["rounds"][number]["matches"],
    roundNumber: number
  ) => (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {matches.map((match) => (
        <MatchCard
          key={match.id}
          court={match.court}
          teamA={getPlayerObjects(match.teamA)}
          teamB={getPlayerObjects(match.teamB)}
          scoreA={match.scoreA}
          scoreB={match.scoreB}
          sets={match.sets}
          completed={isMatchComplete(match)}
          scoringMode={scoringMode}
          status={getMatchStatus(match, roundNumber)}
          highlightPlayers={highlightedPlayerIds}
        />
      ))}
    </div>
  );

  return (
    <section className="space-y-6">
      {!isConnected ? (
        <div
          role="alert"
          className="rounded-2xl border border-padel-danger/50 bg-padel-danger/10 px-4 py-3 text-sm"
        >
          <p className="font-semibold text-padel-danger">Connection lost</p>
          <p className="text-padel-muted mt-1">Scores may be stale. Trying to reconnect…</p>
        </div>
      ) : null}

      {tournamentComplete ? (
        <div className="rounded-2xl border border-padel-primary/40 bg-padel-primary/10 p-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <p className="text-sm font-semibold text-padel-text">
              {isMexicano
                ? "Night ended. View final standings on the leaderboard."
                : "Tournament completed. View final standings on the leaderboard."}
            </p>
            <Link
              href={`/tournament/${token}/leaderboard`}
              className="inline-flex min-h-12 items-center justify-center rounded-2xl border border-padel-border bg-padel-surface px-4 text-sm font-semibold text-padel-text hover:bg-padel-surfaceAlt transition"
            >
              Go to leaderboard
            </Link>
          </div>
        </div>
      ) : null}

      {isMexicano ? <MexicanoStandingsStrip tournament={tournament} token={token} /> : null}

      {waitingForNextRound ? (
        <div className="rounded-2xl border border-padel-border bg-padel-surfaceAlt/40 px-4 py-3 text-sm text-padel-muted">
          Round complete — next pairings appear when the organizer generates the next round.
        </div>
      ) : null}

      <PlayerSearch
        value={searchQuery}
        onChange={setSearchQuery}
        matchCount={filteredMatchCount}
        totalMatches={totalMatchCount}
      />

      {currentRound
        ? (() => {
            const filteredMatches = currentRound.matches.filter(matchesPlayerQuery);
            if (filteredMatches.length === 0 && searchQuery) return null;
            return (
              <RoundSection
                title={`Round ${currentRound.roundNumber}`}
                matchCount={currentRound.matches.length}
                completedMatches={getCompletedMatchCount(currentRound)}
                isLive={!tournamentComplete}
                isCollapsible={false}
              >
                {renderMatchGrid(filteredMatches, currentRound.roundNumber)}
              </RoundSection>
            );
          })()
        : null}

      {upcomingRounds.length > 0
        ? (() => {
            const hasAny = upcomingRounds.some(
              (round) => round.matches.filter(matchesPlayerQuery).length > 0
            );
            if (!hasAny && searchQuery) return null;
            return (
              <div className="space-y-3">
                <h3 className="text-sm font-bold text-padel-primary px-1">
                  {isMexicano ? "Pending" : "Upcoming"}
                </h3>
                {upcomingRounds.map((round) => {
                  const filteredMatches = round.matches.filter(matchesPlayerQuery);
                  if (filteredMatches.length === 0 && searchQuery) return null;
                  return (
                    <RoundSection
                      key={round.id}
                      title={`Round ${round.roundNumber}`}
                      matchCount={round.matches.length}
                      completedMatches={getCompletedMatchCount(round)}
                      isCollapsible
                      defaultExpanded={Boolean(searchQuery.trim()) || isMexicano}
                    >
                      {renderMatchGrid(filteredMatches, round.roundNumber)}
                    </RoundSection>
                  );
                })}
              </div>
            );
          })()
        : null}

      {previousRounds.length > 0
        ? (() => {
            const hasAny = previousRounds.some(
              (round) => round.matches.filter(matchesPlayerQuery).length > 0
            );
            if (!hasAny && searchQuery) return null;
            return (
              <div className="space-y-3">
                <h3 className="text-sm font-bold text-padel-muted px-1">Previous</h3>
                {[...previousRounds].reverse().map((round) => {
                  const filteredMatches = round.matches.filter(matchesPlayerQuery);
                  if (filteredMatches.length === 0 && searchQuery) return null;
                  return (
                    <RoundSection
                      key={round.id}
                      title={`Round ${round.roundNumber}`}
                      matchCount={round.matches.length}
                      completedMatches={getCompletedMatchCount(round)}
                      isCollapsible
                      defaultExpanded={Boolean(searchQuery.trim())}
                    >
                      {renderMatchGrid(filteredMatches, round.roundNumber)}
                    </RoundSection>
                  );
                })}
              </div>
            );
          })()
        : null}

      {searchQuery && filteredMatchCount === 0 ? (
        <div className="py-16 text-center space-y-2">
          <h3 className="text-lg font-bold text-padel-text">No matches found</h3>
          <p className="text-sm text-padel-muted">Try a different player name.</p>
        </div>
      ) : null}

      <p className="text-[13px] text-padel-muted pt-2">No score entry · leaderboard link only</p>
    </section>
  );
}
