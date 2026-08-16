import type { Dispatch, SetStateAction } from "react";

import type { TournamentListResponse } from "../../../types/organizer/tournament";

import { useLiveInsights } from "./useLiveInsights";
import { useLiveRounds } from "./useLiveRounds";
import { useLiveTournamentActions } from "./useLiveTournamentActions";
import { useLiveTournamentCore } from "./useLiveTournamentCore";
import { usePendingPlayers } from "./usePendingPlayers";
import { useRenamePlayers } from "./useRenamePlayers";

export interface UseLiveTournamentParams {
  setTournaments: Dispatch<SetStateAction<TournamentListResponse["data"]>>;
  setErrorText: (value: string) => void;
  markEmailVerifyRequired: (dueAt?: number) => void;
}

export function useLiveTournament({
  setTournaments,
  setErrorText,
  markEmailVerifyRequired
}: UseLiveTournamentParams) {
  const core = useLiveTournamentCore({ setErrorText, markEmailVerifyRequired });
  const rounds = useLiveRounds(core.liveTournament);
  const insights = useLiveInsights(core.liveTournament, rounds.isTournamentCompleted);

  const actions = useLiveTournamentActions({
    liveTournament: core.liveTournament,
    liveTournamentNameDraft: core.liveTournamentNameDraft,
    proposedCourts: core.proposedCourts,
    canFinishNight: rounds.canFinishNight,
    applyTournamentUpdate: core.applyTournamentUpdate,
    setLiveTournament: core.setLiveTournament,
    clampProposedCourts: core.clampProposedCourts,
    setIsEditingCompletedTournament: core.setIsEditingCompletedTournament,
    setTournaments,
    setErrorText
  });

  const pendingPlayers = usePendingPlayers({
    liveTournament: core.liveTournament,
    setLiveTournament: core.setLiveTournament,
    clampProposedCourts: core.clampProposedCourts,
    setErrorText
  });

  const renamePlayers = useRenamePlayers({
    liveTournament: core.liveTournament,
    onTournamentUpdated: core.applyTournamentUpdate,
    setErrorText
  });

  return { ...core, ...rounds, ...insights, ...actions, ...pendingPlayers, ...renamePlayers };
}
