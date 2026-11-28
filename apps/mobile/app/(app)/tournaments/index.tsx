import { useOrganizerAccount } from "../../../src/providers/OrganizerAccountProvider";
import { router } from "expo-router";
import { isKingOfTheCourtMode } from "@padel/shared";

import { DraftOptionsSheets } from "../../../src/components/organizer/list/DraftOptionsSheets";
import { OrganizerListScreen } from "../../../src/components/organizer/list/OrganizerListScreen";
import { useDraftList } from "../../../src/hooks/organizer/drafts/useDraftList";
import { useAuthSessionContext } from "../../../src/providers/AuthSessionProvider";
import { PageShell } from "../../../src/layout";
import { useOrganizerSession } from "../../../src/providers/OrganizerSessionProvider";
import {
  tournamentLivePath,
  tournamentLeaderboardPath
} from "../../../src/utilities/organizer/tournamentRoutes";

export default function TournamentsListRoute() {
  const org = useOrganizerSession();
  const account = useOrganizerAccount();
  const auth = useAuthSessionContext();
  const drafts = useDraftList(auth.ready && Boolean(auth.authToken));
  const openDraft = (id: string) => {
    const koh = isKingOfTheCourtMode(drafts.options.draft?.mode);
    drafts.options.close();
    org.setErrorText("");
    router.push({ pathname: koh ? "/koh" : "/create", params: { draft: id } });
  };

  const openListedTournament = (id: string, edit = false) => {
    const listed = org.tournaments.find((item) => item.id === id);
    if (listed?.config.mode === "KING_OF_THE_COURT") {
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
        canDelete={account.selected?.capabilities.deleteTournament}
        tournaments={org.tournaments}
        drafts={{
          own: drafts.own,
          shared: drafts.shared,
          onOpen: (draft) => {
            org.setErrorText("");
            router.push({ pathname: "/drafts/[id]", params: { id: draft.id } });
          },
          onOpenOptions: drafts.options.open
        }}
        refreshing={org.listRefreshing}
        actionSaving={org.tournamentActionSaving}
        showTournamentOptionsModal={org.showTournamentOptionsModal}
        showTournamentActionConfirmModal={org.showTournamentActionConfirmModal}
        showCareerDeleteModal={org.showCareerDeleteModal}
        pendingTournamentAction={org.pendingTournamentAction}
        onRefresh={() => {
          void org.loadTournaments();
          void drafts.refresh();
        }}
        onCreateAmericano={() => org.beginCreate({ kind: "mode", mode: "AMERICANO" })}
        onCreateMexicano={() => org.beginCreate({ kind: "mode", mode: "MEXICANO" })}
        onCreateKingOfTheCourt={() => {
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
        onCancelCareerDelete={org.cancelCareerDelete}
        onRemoveFromLeaderboard={() => void org.confirmCareerDelete(true)}
        onKeepOnLeaderboard={() => void org.confirmCareerDelete(false)}
      />
      <DraftOptionsSheets options={drafts.options} onContinueEditing={openDraft} />
    </PageShell>
  );
}
