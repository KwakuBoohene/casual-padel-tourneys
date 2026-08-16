import { router } from "expo-router";
import { useRef, useState } from "react";

import { useAuthSessionContext } from "../../providers/AuthSessionProvider";
import type { CreateRouteIntent } from "../../types/organizer/createIntent";
import type { SetupStep } from "../../types/organizer/tournament";
import { openOrganizerTournament, type OpenOrganizerResult } from "../../utilities/organizer/openOrganizerTournament";
import { useKohLiveSession } from "../koh/useKohLiveSession";
import { useGameEstimator } from "./useGameEstimator";
import { useLiveTournament } from "./live/useLiveTournament";
import { useScoreDrafts } from "./score/useScoreDrafts";
import { useTournamentList } from "./useTournamentList";

export function useOrganizerScreen() {
  const auth = useAuthSessionContext();
  const [step, setStep] = useState<SetupStep>("LIST");
  const [errorText, setErrorText] = useState("");
  const viewerBaseUrl = process.env.EXPO_PUBLIC_VIEWER_BASE_URL ?? "http://localhost:3000";
  const createIntentRef = useRef<CreateRouteIntent | null>(null);
  const liveCallbacks = useRef({
    openTournament: (async () => "error") as (
      tournamentId: string,
      editMode?: boolean
    ) => Promise<OpenOrganizerResult>,
    onTournamentDeleted: (_id: string) => {}
  });

  const list = useTournamentList({
    authReady: auth.ready,
    authToken: auth.authToken,
    setErrorText,
    markEmailVerifyRequired: auth.markEmailVerifyRequired,
    clearEmailVerifyRequired: auth.clearEmailVerifyRequired,
    openTournament: (id, editMode) => liveCallbacks.current.openTournament(id, editMode),
    onTournamentDeleted: (id) => liveCallbacks.current.onTournamentDeleted(id)
  });

  const live = useLiveTournament({
    setTournaments: list.setTournaments,
    setErrorText,
    markEmailVerifyRequired: auth.markEmailVerifyRequired
  });
  const koh = useKohLiveSession({
    setErrorText,
    markEmailVerifyRequired: auth.markEmailVerifyRequired
  });
  const estimator = useGameEstimator();
  const drafts = useScoreDrafts({
    liveTournament: live.liveTournament,
    displayedRound: live.displayedRound,
    onTournamentUpdated: live.applyTournamentUpdate,
    setErrorText
  });

  const openTournamentSmart = (tournamentId: string, editMode?: boolean) =>
    openOrganizerTournament({
      tournamentId,
      editMode,
      listed: list.tournaments.find((item) => item.id === tournamentId),
      openKoh: koh.openKohTournament,
      openAmericano: live.openTournament,
      setStep
    });

  liveCallbacks.current = {
    openTournament: openTournamentSmart,
    onTournamentDeleted: (id) => {
      if (live.liveTournament?.id === id) {
        live.setLiveTournament(null);
        setStep("LIST");
        router.replace("/tournaments");
      }
      if (koh.kohHub?.id === id) {
        koh.clearKohHub();
        setStep("LIST");
        router.replace("/tournaments");
      }
    }
  };

  return {
    ...estimator,
    ...list,
    ...live,
    ...drafts,
    ...koh,
    openTournament: openTournamentSmart,
    beginCreate: (intent: CreateRouteIntent) => {
      createIntentRef.current = intent;
      router.push("/create");
    },
    consumeCreateIntent: () => {
      const intent = createIntentRef.current;
      createIntentRef.current = null;
      return intent;
    },
    authReady: auth.ready,
    authToken: auth.authToken,
    currentUser: auth.currentUser,
    emailVerifyRequired: auth.emailVerifyRequired,
    verifyBy: auth.verifyBy,
    handleSignedIn: auth.handleSignedIn,
    handleSignOut: async () => {
      await auth.handleSignOut();
      list.setTournaments([]);
      live.setLiveTournament(null);
      koh.clearKohHub();
      setStep("LIST");
      router.replace("/sign-in");
    },
    updateUser: auth.updateUser,
    clearEmailVerifyRequired: auth.clearEmailVerifyRequired,
    markEmailVerifyRequired: auth.markEmailVerifyRequired,
    step,
    setStep,
    errorText,
    setErrorText,
    viewerBaseUrl
  };
}
