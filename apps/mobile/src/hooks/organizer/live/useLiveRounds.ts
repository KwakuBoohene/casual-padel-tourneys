import { useEffect, useMemo, useState } from "react";

import type { LiveTournamentState } from "../../../types/organizer/tournament";
import { areAllMatchesResolved, countUnfinishedMatches } from "@padel/shared";

export function useLiveRounds(liveTournament: LiveTournamentState | null) {
  const [selectedRoundIndex, setSelectedRoundIndex] = useState(0);
  const isMexicano = liveTournament?.config.mode === "MEXICANO";

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
  }, [liveTournament, activeRound, sortedRounds]);

  const latestRound = sortedRounds[sortedRounds.length - 1] ?? null;
  const isLatestRoundComplete = Boolean(
    latestRound && latestRound.matches.length > 0 && latestRound.matches.every((match) => match.completed)
  );

  const isTournamentCompleted = useMemo(() => {
    if (!liveTournament) {
      return false;
    }
    // A closed event is done in every mode, however much was left unplayed.
    if (liveTournament.endedAt) {
      return true;
    }
    // Mexicano is open-ended until the organizer ends the night.
    if (isMexicano) {
      return false;
    }
    return areAllMatchesResolved(liveTournament.rounds);
  }, [isMexicano, liveTournament]);

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
    isTournamentCompleted,
    isMexicano,
    isLatestRoundComplete,
    canGenerateNextRound: Boolean(isMexicano && isLatestRoundComplete && !liveTournament?.endedAt),
    // Closing early is allowed in every mode; unplayed matches are voided, not lost.
    canFinishNight: !liveTournament?.endedAt,
    unfinishedMatchCount: countUnfinishedMatches(liveTournament?.rounds ?? [])
  };
}
