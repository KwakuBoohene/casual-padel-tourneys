import { Redirect, router, useLocalSearchParams } from "expo-router";
import { isKingOfTheCourtMode } from "@padel/shared";

import { useOrganizerGa4 } from "../../../src/components/analytics/OrganizerGa4";
import { PageShell } from "../../../src/layout";
import { useAuthSessionContext } from "../../../src/providers/AuthSessionProvider";
import { useOrganizerAccount } from "../../../src/providers/OrganizerAccountProvider";
import { useOrganizerSession } from "../../../src/providers/OrganizerSessionProvider";
import { DraftOverviewScreen } from "../../../src/screens/DraftOverviewScreen";
import type { KohTournamentHub } from "../../../src/types/koh/create";
import type { LiveTournamentState } from "../../../src/types/organizer/tournament";
import { tournamentLeaderboardPath, tournamentLivePath } from "../../../src/utilities/organizer/tournamentRoutes";

const first = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);

export default function DraftOverviewRoute() {
  const org = useOrganizerSession();
  const sendAnalytics = useOrganizerGa4();
  const auth = useAuthSessionContext();
  const account = useOrganizerAccount();
  const params = useLocalSearchParams<{ id?: string | string[]; start?: string | string[] }>();
  const draftId = first(params.id);
  if (!draftId) return <Redirect href="/tournaments" />;

  const backToList = () => {
    if (router.canGoBack()) router.back();
    else router.replace("/tournaments");
  };

  return (
    <PageShell>
      <DraftOverviewScreen
        draftId={draftId}
        openStart={first(params.start) === "1"}
        markEmailVerifyRequired={org.markEmailVerifyRequired}
        sharingEnabled={account.enabled && !auth.currentUser?.isGuest}
        viewer={{ id: auth.currentUser?.id, email: auth.currentUser?.email }}
        onBack={backToList}
        onEditStep={(step) => {
          org.setErrorText("");
          router.replace({ pathname: "/create", params: { draft: draftId, step, from: "overview" } });
        }}
        onStarted={(response, draft) => {
          // Same hand-off as the create flows, so the live screens open with the tournament cached.
          sendAnalytics({ event: "creation_succeeded" });
          void org.loadTournaments();
          if (isKingOfTheCourtMode(draft.mode)) {
            org.adoptKohHub(response.data as KohTournamentHub);
            router.replace("/koh/live");
            return;
          }
          const tournament = response.data as LiveTournamentState;
          org.adoptTournament(tournament, false);
          router.replace(tournamentLivePath(tournament.id));
        }}
        onOpenTournament={(tournamentId) => {
          void (async () => {
            void org.loadTournaments();
            const result = await org.openTournament(tournamentId);
            if (result === "koh") router.replace("/koh/live");
            else if (result === "live") router.replace(tournamentLivePath(tournamentId));
            else if (result === "leaderboard") router.replace(tournamentLeaderboardPath(tournamentId));
            else router.replace("/tournaments");
          })();
        }}
      />
    </PageShell>
  );
}
