import { useMemo, useState } from "react";

import { renameKohPlayer, replaceKohPartner } from "../../api/koh";
import { isEmailVerifyRequired } from "../../api/errors";
import type { KohTournamentHub } from "../../types/koh/create";
import { listKohEditUnits, type KohEditUnitRow } from "../../utilities/koh/editPlayersList";

export function useKohEditPlayers(params: {
  hub: KohTournamentHub;
  setHub: (hub: KohTournamentHub) => void;
  setErrorText: (value: string) => void;
  markEmailVerifyRequired: (dueAt?: number) => void;
}) {
  const [selected, setSelected] = useState<KohEditUnitRow | null>(null);
  const [renamePlayerId, setRenamePlayerId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [replacePlayerId, setReplacePlayerId] = useState<string | null>(null);
  const [replaceName, setReplaceName] = useState("");
  const [confirmReplace, setConfirmReplace] = useState(false);
  const [saving, setSaving] = useState(false);

  const units = useMemo(() => listKohEditUnits(params.hub), [params.hub]);

  const selectedFresh = useMemo(() => {
    if (!selected) return null;
    return units.find((row) => row.unit.id === selected.unit.id) ?? selected;
  }, [selected, units]);

  const leaveName =
    selectedFresh && replacePlayerId === selectedFresh.unit.playerAId
      ? selectedFresh.unit.playerAName
      : selectedFresh?.unit.playerBName ?? "";
  const stayName =
    selectedFresh && replacePlayerId === selectedFresh.unit.playerAId
      ? selectedFresh.unit.playerBName
      : selectedFresh?.unit.playerAName ?? "";

  return {
    units,
    selected: selectedFresh,
    setSelected,
    renamePlayerId,
    renameValue,
    setRenameValue,
    replacePlayerId,
    replaceName,
    setReplaceName,
    confirmReplace,
    setConfirmReplace,
    saving,
    leaveName,
    stayName,
    openRename: (playerId: string, currentName: string) => {
      setReplacePlayerId(null);
      setConfirmReplace(false);
      setRenamePlayerId(playerId);
      setRenameValue(currentName);
    },
    openReplace: (playerId: string) => {
      if (selectedFresh?.midMatch) {
        params.setErrorText("Blocked mid-match. Finish or abandon the score first.");
        return;
      }
      setRenamePlayerId(null);
      setReplacePlayerId(playerId);
      setReplaceName("");
      setConfirmReplace(false);
    },
    dismissSubflow: () => {
      setRenamePlayerId(null);
      setReplacePlayerId(null);
      setConfirmReplace(false);
      setReplaceName("");
    },
    submitRename: async () => {
      if (!renamePlayerId) return;
      setSaving(true);
      try {
        params.setErrorText("");
        const hub = await renameKohPlayer(params.hub.id, renamePlayerId, {
          newName: renameValue.trim(),
          expectedVersion: params.hub.version
        });
        params.setHub(hub);
        setRenamePlayerId(null);
      } catch (error) {
        if (isEmailVerifyRequired(error)) params.markEmailVerifyRequired(error.verifyBy);
        else params.setErrorText((error as Error).message);
      } finally {
        setSaving(false);
      }
    },
    submitReplace: async () => {
      if (!selectedFresh || !replacePlayerId) return;
      setSaving(true);
      try {
        params.setErrorText("");
        const hub = await replaceKohPartner(params.hub.id, selectedFresh.unit.id, {
          leavePlayerId: replacePlayerId,
          replacement: { name: replaceName.trim() },
          expectedVersion: params.hub.version
        });
        params.setHub(hub);
        setReplacePlayerId(null);
        setConfirmReplace(false);
        setReplaceName("");
        setSelected(null);
      } catch (error) {
        if (isEmailVerifyRequired(error)) params.markEmailVerifyRequired(error.verifyBy);
        else params.setErrorText((error as Error).message);
      } finally {
        setSaving(false);
      }
    }
  };
}
