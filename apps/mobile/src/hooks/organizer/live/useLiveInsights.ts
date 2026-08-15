import { useMemo, useState } from "react";

import type { LiveTournamentState } from "../../../types/organizer/tournament";
import { buildLeaderboardRows, buildPlayerGameRows, computeLiveTimeStatus } from "../../../utilities/organizer/utils";

export function useLiveInsights(liveTournament: LiveTournamentState | null, isTournamentCompleted: boolean) {
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null);

  const playerNameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const player of liveTournament?.players ?? []) {
      map.set(player.id, player.name);
    }
    return map;
  }, [liveTournament?.players]);

  const liveTimeStatus = useMemo(
    () =>
      liveTournament ? computeLiveTimeStatus(liveTournament) : { roundsLeft: 0, estimatedMinutesLeft: 0 },
    [liveTournament]
  );

  const maxCourts = useMemo(() => {
    if (!liveTournament) {
      return 1;
    }
    return Math.max(1, Math.floor(liveTournament.players.length / 4));
  }, [liveTournament]);

  const canAdjustCourts = useMemo(() => {
    if (!liveTournament || isTournamentCompleted) {
      return false;
    }
    if (liveTournament.config.mode === "MEXICANO") {
      return false;
    }
    return liveTournament.config.courts > 1 || maxCourts > liveTournament.config.courts;
  }, [isTournamentCompleted, liveTournament, maxCourts]);

  const leaderboardRows = useMemo(
    () => (liveTournament ? buildLeaderboardRows(liveTournament) : []),
    [liveTournament]
  );

  const selectedPlayerGames = useMemo(() => {
    if (!liveTournament || !selectedPlayerId) {
      return [];
    }
    return buildPlayerGameRows({
      tournament: liveTournament,
      selectedPlayerId,
      playerNameById
    });
  }, [liveTournament, playerNameById, selectedPlayerId]);

  return {
    playerNameById,
    liveTimeStatus,
    maxCourts,
    canAdjustCourts,
    leaderboardRows,
    selectedPlayerId,
    setSelectedPlayerId,
    selectedPlayerGames
  };
}
