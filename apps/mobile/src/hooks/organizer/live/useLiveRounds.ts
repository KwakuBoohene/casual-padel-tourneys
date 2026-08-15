import { useEffect, useMemo, useState } from "react";

import type { LiveTournamentState } from "../types";

export function useLiveRounds(liveTournament: LiveTournamentState | null) {
  const [selectedRoundIndex, setSelectedRoundIndex] = useState(0);

  const sortedRounds = useMemo(() => {
    if (!liveTournament) return [];
    return [...liveTournament.rounds].sort((a, b) => a.roundNumber - b.roundNumber);
  }, [liveTournament]);

  const activeRound = useMemo(() => {
    if (!liveTournament) {
      return null;
    }
    return (
      liveTournament.rounds.find((round) => !round.isLocked) ?? sortedRounds[sortedRounds.length - 1] ?? null
    );
  }, [liveTournament, sortedRounds]);

  const displayedRound = useMemo(
    () => sortedRounds[selectedRoundIndex] ?? null,
    [sortedRounds, selectedRoundIndex]
  );

  useEffect(() => {
    if (!liveTournament || !activeRound) return;
    const idx = sortedRounds.findIndex((r) => r.id === activeRound.id);
    if (idx >= 0) setSelectedRoundIndex(idx);
  }, [liveTournament?.id, activeRound?.id, sortedRounds]);

  const isTournamentCompleted = useMemo(() => {
    if (!liveTournament) {
      return false;
    }
    return liveTournament.rounds.every((round) => round.matches.every((match) => match.completed));
  }, [liveTournament]);

  const isLastRound = useMemo(() => {
    if (!activeRound || !liveTournament) {
      return false;
    }
    const highestRound = Math.max(...liveTournament.rounds.map((round) => round.roundNumber));
    return activeRound.roundNumber === highestRound;
  }, [activeRound, liveTournament]);

  return {
    activeRound,
    displayedRound,
    sortedRounds,
    selectedRoundIndex,
    goToPrevRound: () => setSelectedRoundIndex((i) => Math.max(0, i - 1)),
    goToNextRound: () => setSelectedRoundIndex((i) => Math.min(sortedRounds.length - 1, i + 1)),
    isLastRound,
    isTournamentCompleted
  };
}
