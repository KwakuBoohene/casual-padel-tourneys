import { router } from "expo-router";

import { OrganizerListScreen } from "../../../src/components/organizer/list/OrganizerListScreen";
import { useOrganizerSession } from "../../../src/providers/OrganizerSessionProvider";

export default function TournamentsListRoute() {
  const org = useOrganizerSession();

  const goFlow = (start: () => void) => {
    start();
    router.push("/flow");
  };

  return (
    <OrganizerListScreen
      tournaments={org.tournaments}
      refreshing={org.listRefreshing}
      errorText={org.errorText}
      showTournamentOptionsModal={org.showTournamentOptionsModal}
      showTournamentActionConfirmModal={org.showTournamentActionConfirmModal}
      pendingTournamentAction={org.pendingTournamentAction}
      onRefresh={() => void org.loadTournaments()}
      onCreateAmericano={() => goFlow(() => org.startCreateWithMode("AMERICANO"))}
      onCreateMexicano={() => goFlow(() => org.startCreateWithMode("MEXICANO"))}
      onCreateKingOfTheHill={() =>
        goFlow(() => {
          org.setErrorText("");
          org.setStep("KOH");
        })
      }
      onOpenEstimator={() => router.push("/estimator")}
      onOpenTournament={(id) =>
        goFlow(() => {
          void org.openTournament(id);
        })
      }
      onOpenOptions={org.openTournamentOptions}
      onOpenProfile={() => router.push("/profile")}
      onOpenAccountPlayers={() =>
        goFlow(() => {
          org.setErrorText("");
          org.setStep("ACCOUNT_PLAYERS");
        })
      }
      onCloseOptionsModal={() => org.setShowTournamentOptionsModal(false)}
      onRequestEdit={() => org.requestTournamentAction("EDIT")}
      onRequestDelete={() => org.requestTournamentAction("DELETE")}
      onCancelActionConfirm={() => org.setShowTournamentActionConfirmModal(false)}
      onConfirmAction={() => {
        const wasEdit = org.pendingTournamentAction === "EDIT";
        void (async () => {
          await org.confirmTournamentAction();
          if (wasEdit) {
            router.push("/flow");
          }
        })();
      }}
    />
  );
}
