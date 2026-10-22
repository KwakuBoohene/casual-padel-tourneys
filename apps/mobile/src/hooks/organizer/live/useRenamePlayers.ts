import { useState } from "react";

import { useSubmission } from "../../useSubmission";

import { apiPost } from "../../../api/client";
import type { LiveTournamentState, TournamentResponse } from "../../../types/organizer/tournament";

export function useRenamePlayers(params: {
  liveTournament: LiveTournamentState | null;
  onTournamentUpdated: (data: LiveTournamentState) => void;
  setErrorText: (value: string) => void;
}) {
  const [visible, setVisible] = useState(false);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const { saving, run, isPending } = useSubmission();

  const openRenamePlayers = () => {
    if (!params.liveTournament) return;
    const next: Record<string, string> = {};
    for (const player of params.liveTournament.players) {
      next[player.id] = player.name;
    }
    setDrafts(next);
    setVisible(true);
  };

  const closeRenamePlayers = () => {
    if (isPending()) return;
    setVisible(false);
    setDrafts({});
  };

  const changeDraft = (playerId: string, name: string) => {
    if (isPending()) return;
    setDrafts((previous) => ({ ...previous, [playerId]: name }));
  };

  const saveRenames = () =>
    run(async () => {
      if (!params.liveTournament) return;
      const changes = params.liveTournament.players.filter((player) => {
        const draft = drafts[player.id]?.trim() ?? "";
        return draft.length > 0 && draft !== player.name;
      });
      if (changes.length === 0) {
        setVisible(false);
        setDrafts({});
        return;
      }
      params.setErrorText("");
      try {
        let tournament = params.liveTournament;
        for (const player of changes) {
          const response = await apiPost<TournamentResponse>("/tournaments/rename-player", {
            tournamentId: tournament.id,
            playerId: player.id,
            newName: drafts[player.id].trim()
          });
          tournament = response.data;
          params.onTournamentUpdated(response.data);
        }
        setVisible(false);
        setDrafts({});
      } catch (error) {
        params.setErrorText((error as Error).message);
      }
    });

  return {
    renamePlayersVisible: visible,
    renameDrafts: drafts,
    renameSaving: saving,
    openRenamePlayers,
    closeRenamePlayers,
    changeRenameDraft: changeDraft,
    saveRenames
  };
}
