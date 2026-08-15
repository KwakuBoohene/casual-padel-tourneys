import { useState } from "react";

import { apiPost } from "../../../api/client";
import type { LiveTournamentState, TournamentResponse } from "../../../types/organizer/tournament";

export function useRenamePlayers(params: {
  liveTournament: LiveTournamentState | null;
  onTournamentUpdated: (data: LiveTournamentState) => void;
  setErrorText: (value: string) => void;
}) {
  const [visible, setVisible] = useState(false);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

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
    setVisible(false);
    setDrafts({});
  };

  const changeDraft = (playerId: string, name: string) => {
    setDrafts((previous) => ({ ...previous, [playerId]: name }));
  };

  const saveRenames = async () => {
    if (!params.liveTournament) return;
    const changes = params.liveTournament.players.filter((player) => {
      const draft = drafts[player.id]?.trim() ?? "";
      return draft.length > 0 && draft !== player.name;
    });
    if (changes.length === 0) {
      closeRenamePlayers();
      return;
    }
    setSaving(true);
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
      closeRenamePlayers();
    } catch (error) {
      params.setErrorText((error as Error).message);
    } finally {
      setSaving(false);
    }
  };

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
