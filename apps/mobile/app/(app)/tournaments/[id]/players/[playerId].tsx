import { useMemo } from "react";
import { router, useLocalSearchParams } from "expo-router";

import { PlayerGamesView } from "../../../../../src/components/organizer/leaderboard/PlayerGamesView";
import { PageShell } from "../../../../../src/layout";
import { useOrganizerSession } from "../../../../../src/providers/OrganizerSessionProvider";
import { buildPlayerGameRows } from "../../../../../src/utilities/organizer/utils";

export default function TournamentPlayerGamesRoute() {
  const org = useOrganizerSession();
  const params = useLocalSearchParams<{ id: string; playerId: string }>();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;
  const playerId = Array.isArray(params.playerId) ? params.playerId[0] : params.playerId;

  const games = useMemo(() => {
    if (!org.liveTournament || !playerId) return [];
    return buildPlayerGameRows({
      tournament: org.liveTournament,
      selectedPlayerId: playerId,
      playerNameById: org.playerNameById
    });
  }, [org.liveTournament, org.playerNameById, playerId]);

  if (!org.liveTournament || !id || org.liveTournament.id !== id || !playerId) {
    return null;
  }

  const playerName = org.playerNameById.get(playerId) ?? playerId;
  const row = org.leaderboardRows.find((entry) => entry.playerId === playerId);

  return (
    <PageShell>
      <PlayerGamesView playerName={playerName} row={row} games={games} onBack={() => router.back()} />
    </PageShell>
  );
}
