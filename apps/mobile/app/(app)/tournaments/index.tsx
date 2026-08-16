import { router } from "expo-router";

import { OrganizerListScreen } from "../../../src/components/organizer/list/OrganizerListScreen";
import { PageShell } from "../../../src/layout";
import { useOrganizerSession } from "../../../src/providers/OrganizerSessionProvider";
import { tournamentLivePath, tournamentLeaderboardPath } from "../../../src/utilities/organizer/tournamentRoutes";

export default function TournamentsListRoute() {
  const org = useOrganizerSession();

  const openListedTournament = (id: string, edit = false) => {
    const listed = org.tournaments.find((item) => item.id === id);
    if (listed?.config.mode === "KING_OF_THE_HILL") {
      void (async () => {
        const result = await org.openTournament(id, edit);
        if (result === "koh") router.push("/koh/live");
      })();
      return;
    }
    router.push(tournamentLivePath(id, edit));
  };

  return (
    <PageShell>
      <OrganizerListScreen
        tournaments={org.tournaments}
        refreshing={org.listRefreshing}
        errorText={org.errorText}
        showTournamentOptionsModal={org.showTournamentOptionsModal}
        showTournamentActionConfirmModal={org.showTournamentActionConfirmModal}
        pendingTournamentAction={org.pendingTournamentAction}
        onRefresh={() => void org.loadTournaments()}
        onCreateAmericano={() => org.beginCreate({ kind: "mode", mode: "AMERICANO" })}
        onCreateMexicano={() => org.beginCreate({ kind: "mode", mode: "MEXICANO" })}
        onCreateKingOfTheHill={() => {
          org.setErrorText("");
          org.clearKohHub();
          router.push("/koh");
        }}
        onOpenEstimator={() => router.push("/estimator")}
        onOpenTournament={(id) => openListedTournament(id)}
        onOpenOptions={org.openTournamentOptions}
        onOpenProfile={() => router.push("/profile")}
        onOpenAccountPlayers={() => {
          org.setErrorText("");
          router.push("/account-players");
        }}
        onCloseOptionsModal={() => org.setShowTournamentOptionsModal(false)}
        onRequestEdit={() => org.requestTournamentAction("EDIT")}
        onRequestDelete={() => org.requestTournamentAction("DELETE")}
        onCancelActionConfirm={() => org.setShowTournamentActionConfirmModal(false)}
        onConfirmAction={() => {
          void (async () => {
            const result = await org.confirmTournamentAction();
            if (!result || result.action !== "EDIT") return;
            if (result.openResult === "koh" || result.openResult === "error") {
              if (result.openResult === "koh") router.push("/koh/live");
              return;
            }
            if (result.openResult === "leaderboard") {
              router.push(tournamentLeaderboardPath(result.tournamentId));
              return;
            }
            router.push(tournamentLivePath(result.tournamentId, true));
          })();
        }}
      />
    </PageShell>
  );
}
