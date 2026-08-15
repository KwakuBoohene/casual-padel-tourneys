import { useRef, useState } from "react";

import { useAuthSession } from "../../../hooks/useAuthSession";
import type { SetupStep } from "../types";

import { useCreateTournament } from "./useCreateTournament";
import { useGameEstimator } from "./useGameEstimator";
import { useLiveTournament } from "./useLiveTournament";
import { useScoreDrafts } from "./useScoreDrafts";
import { useTournamentList } from "./useTournamentList";

export function useOrganizerScreen() {
  const {
    ready: authReady,
    authToken,
    currentUser,
    emailVerifyRequired,
    verifyBy,
    handleSignedIn,
    handleSignOut,
    updateUser,
    markEmailVerifyRequired,
    clearEmailVerifyRequired
  } = useAuthSession();
  const [step, setStep] = useState<SetupStep>("LIST");
  const [errorText, setErrorText] = useState("");
  const viewerBaseUrl = process.env.EXPO_PUBLIC_VIEWER_BASE_URL ?? "http://localhost:3000";

  // The list needs to open/clear the live tournament, while the live tournament needs to write
  // back into the list, so the live callbacks are forwarded through a ref to break the cycle.
  const liveCallbacks = useRef({
    openTournament: (async () => {}) as (tournamentId: string, editMode?: boolean) => Promise<void>,
    onTournamentDeleted: (_tournamentId: string) => {}
  });

  const list = useTournamentList({
    authReady,
    authToken,
    setErrorText,
    markEmailVerifyRequired,
    clearEmailVerifyRequired,
    openTournament: (tournamentId, editMode) => liveCallbacks.current.openTournament(tournamentId, editMode),
    onTournamentDeleted: (tournamentId) => liveCallbacks.current.onTournamentDeleted(tournamentId)
  });

  const live = useLiveTournament({
    setStep,
    setTournaments: list.setTournaments,
    setErrorText,
    markEmailVerifyRequired
  });

  liveCallbacks.current = {
    openTournament: live.openTournament,
    onTournamentDeleted: (tournamentId) => {
      if (live.liveTournament?.id === tournamentId) {
        live.setLiveTournament(null);
        setStep("LIST");
      }
    }
  };

  const create = useCreateTournament({
    tournaments: list.tournaments,
    suggestedPlayerNames: list.suggestedPlayerNames,
    setTournaments: list.setTournaments,
    setStep,
    setErrorText,
    markEmailVerifyRequired,
    adoptTournament: live.adoptTournament
  });

  const estimator = useGameEstimator();

  const drafts = useScoreDrafts({
    liveTournament: live.liveTournament,
    displayedRound: live.displayedRound,
    onTournamentUpdated: live.applyTournamentUpdate,
    setErrorText
  });

  const signOutAndReset = async () => {
    await handleSignOut();
    list.setTournaments([]);
    live.setLiveTournament(null);
    setStep("LIST");
  };

  return {
    ...create,
    ...estimator,
    ...list,
    ...live,
    ...drafts,
    authReady,
    authToken,
    currentUser,
    emailVerifyRequired,
    verifyBy,
    handleSignedIn,
    handleSignOut: signOutAndReset,
    updateUser,
    clearEmailVerifyRequired,
    step,
    setStep,
    errorText,
    viewerBaseUrl
  };
}
