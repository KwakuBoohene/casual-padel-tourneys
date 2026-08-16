import { router, useLocalSearchParams } from "expo-router";

import { LeaderboardView } from "../../../../src/components/organizer/leaderboard/LeaderboardView";
import { PageShell } from "../../../../src/layout";
import { useOrganizerSession } from "../../../../src/providers/OrganizerSessionProvider";
import {
  tournamentLivePath,
  tournamentPlayerGamesPath
} from "../../../../src/utilities/organizer/tournamentRoutes";

export default function TournamentLeaderboardRoute() {
  const org = useOrganizerSession();
  const params = useLocalSearchParams<{ id: string }>();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;

  if (!org.liveTournament || !id || org.liveTournament.id !== id) {
    return null;
  }

  return (
    <PageShell>
      <LeaderboardView
        tournament={org.liveTournament}
        rows={org.leaderboardRows}
        onBack={() => router.replace(tournamentLivePath(id))}
        onBackToList={() => {
          org.setLiveTournament(null);
          router.replace("/tournaments");
        }}
        onOpenPlayer={(playerId) => router.push(tournamentPlayerGamesPath(id, playerId))}
      />
    </PageShell>
  );
}
