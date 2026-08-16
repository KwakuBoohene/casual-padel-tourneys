import { useQueryClient } from "@tanstack/react-query";

import { useLiveInsights } from "./useLiveInsights";
import { useLiveRounds } from "./useLiveRounds";
import { useLiveTournamentActions } from "./useLiveTournamentActions";
import { useLiveTournamentCore } from "./useLiveTournamentCore";
import { usePendingPlayers } from "./usePendingPlayers";
import { useRenamePlayers } from "./useRenamePlayers";
import { useTournamentSocket } from "./useTournamentSocket";
import { removeTournamentCaches } from "../../../utilities/organizer/tournamentQueryCache";

export interface UseLiveTournamentParams {
  setErrorText: (value: string) => void;
  markEmailVerifyRequired: (dueAt?: number) => void;
}

export function useLiveTournament({
  setErrorText,
  markEmailVerifyRequired
}: UseLiveTournamentParams) {
  const queryClient = useQueryClient();
  const core = useLiveTournamentCore({ setErrorText, markEmailVerifyRequired });
  const rounds = useLiveRounds(core.liveTournament);
  const insights = useLiveInsights(core.liveTournament, rounds.isTournamentCompleted);

  useTournamentSocket({
    tournamentId: core.liveTournament?.id ?? null,
    publicToken: core.liveTournament?.publicToken ?? null,
    enabled: Boolean(core.liveTournament),
    onTournament: (data) => {
      core.applyTournamentUpdate(data);
      core.clampProposedCourts(data.players.length);
      if (!data.rounds.every((round) => round.matches.every((match) => match.completed))) {
        core.setIsEditingCompletedTournament(false);
      }
    },
    onDeleted: (tournamentId) => {
      core.setLiveTournament(null);
      removeTournamentCaches(queryClient, tournamentId);
    }
  });

  const actions = useLiveTournamentActions({
    liveTournament: core.liveTournament,
    liveTournamentNameDraft: core.liveTournamentNameDraft,
    proposedCourts: core.proposedCourts,
    canFinishNight: rounds.canFinishNight,
    applyTournamentUpdate: core.applyTournamentUpdate,
    setLiveTournament: core.setLiveTournament,
    clampProposedCourts: core.clampProposedCourts,
    setIsEditingCompletedTournament: core.setIsEditingCompletedTournament,
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
