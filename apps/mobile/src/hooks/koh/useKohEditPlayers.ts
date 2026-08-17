import { useMemo, useState } from "react";

import { renameKohPlayer } from "../../api/koh";
import type { KohTournamentHub } from "../../types/koh/create";
import { listKohEditUnits, type KohEditUnitRow } from "../../utilities/koh/editPlayersList";
import { reportKohEditError } from "../../utilities/koh/reportKohEditError";

import { useKohReplacePartner } from "./useKohReplacePartner";

export function useKohEditPlayers(params: {
  hub: KohTournamentHub;
  setHub: (hub: KohTournamentHub) => void;
  setErrorText: (value: string) => void;
  markEmailVerifyRequired: (dueAt?: number) => void;
}) {
  const [selected, setSelected] = useState<KohEditUnitRow | null>(null);
  const [renamePlayerId, setRenamePlayerId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [renameSaving, setRenameSaving] = useState(false);

  const units = useMemo(() => listKohEditUnits(params.hub), [params.hub]);
  const selectedFresh = useMemo(() => {
    if (!selected) return null;
    return units.find((row) => row.unit.id === selected.unit.id) ?? selected;
  }, [selected, units]);

  const replace = useKohReplacePartner({
    hub: params.hub,
    setHub: params.setHub,
    selectedFresh,
    setErrorText: params.setErrorText,
    markEmailVerifyRequired: params.markEmailVerifyRequired,
    setSelected
  });

  return {
    units,
    selected: selectedFresh,
    setSelected,
    renamePlayerId,
    renameValue,
    setRenameValue,
    replacePlayerId: replace.replacePlayerId,
    replaceName: replace.replaceName,
    setReplaceName: replace.setReplaceName,
    selectedReplacementId: replace.selectedReplacementId,
    addingNew: replace.addingNew,
    confirmReplace: replace.confirmReplace,
    setConfirmReplace: replace.setConfirmReplace,
    saving: renameSaving || replace.saving,
    leaveName: replace.leaveName,
    stayName: replace.stayName,
    joinName: replace.joinName,
    replacePartners: replace.partners,
    openRename: (playerId: string, currentName: string) => {
      replace.resetReplace();
      setRenamePlayerId(playerId);
      setRenameValue(currentName);
    },
    openReplace: (playerId: string) => {
      setRenamePlayerId(null);
      replace.openReplace(playerId);
    },
    selectReplacement: replace.selectReplacement,
    toggleAddingNew: replace.toggleAddingNew,
    dismissSubflow: () => {
      setRenamePlayerId(null);
      replace.resetReplace();
    },
    submitRename: async () => {
      if (!renamePlayerId) return;
      setRenameSaving(true);
      try {
        params.setErrorText("");
        const hub = await renameKohPlayer(params.hub.id, renamePlayerId, {
          newName: renameValue.trim(),
          expectedVersion: params.hub.version
        });
        params.setHub(hub);
        setRenamePlayerId(null);
      } catch (error) {
        reportKohEditError(error, params.markEmailVerifyRequired, params.setErrorText);
      } finally {
        setRenameSaving(false);
      }
    },
    submitReplace: replace.submitReplace
  };
}
