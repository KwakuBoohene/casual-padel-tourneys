import { useMemo, useState } from "react";

import { replaceKohPartner } from "../../api/koh";
import type { KohTournamentHub } from "../../types/koh/create";
import type { KohEditUnitRow } from "../../utilities/koh/editPlayersList";
import { eligibleReplacePartners } from "../../utilities/koh/eligibleReplacePartners";
import { reportKohEditError } from "../../utilities/koh/reportKohEditError";

export function useKohReplacePartner(params: {
  hub: KohTournamentHub;
  setHub: (hub: KohTournamentHub) => void;
  selectedFresh: KohEditUnitRow | null;
  setErrorText: (value: string) => void;
  markEmailVerifyRequired: (dueAt?: number) => void;
  setSelected: (row: KohEditUnitRow | null) => void;
}) {
  const [replacePlayerId, setReplacePlayerId] = useState<string | null>(null);
  const [replaceName, setReplaceName] = useState("");
  const [selectedReplacementId, setSelectedReplacementId] = useState<string | null>(null);
  const [addingNew, setAddingNew] = useState(false);
  const [confirmReplace, setConfirmReplace] = useState(false);
  const [saving, setSaving] = useState(false);

  const leaveIsA = params.selectedFresh?.unit.playerAId === replacePlayerId;
  const leaveName = leaveIsA
    ? params.selectedFresh?.unit.playerAName ?? ""
    : params.selectedFresh?.unit.playerBName ?? "";
  const stayName = leaveIsA
    ? params.selectedFresh?.unit.playerBName ?? ""
    : params.selectedFresh?.unit.playerAName ?? "";
  const stayPlayerId = leaveIsA
    ? params.selectedFresh?.unit.playerBId ?? ""
    : params.selectedFresh?.unit.playerAId ?? "";

  const partners = useMemo(() => {
    if (!params.selectedFresh || !replacePlayerId) return [];
    return eligibleReplacePartners(
      params.hub,
      replacePlayerId,
      stayPlayerId,
      params.selectedFresh.courtNumber
    );
  }, [params.hub, params.selectedFresh, replacePlayerId, stayPlayerId]);

  const joinName = addingNew
    ? replaceName.trim()
    : partners.find((row) => row.playerId === selectedReplacementId)?.name ?? "";

  function resetReplace(): void {
    setReplacePlayerId(null);
    setConfirmReplace(false);
    setReplaceName("");
    setSelectedReplacementId(null);
    setAddingNew(false);
  }

  return {
    replacePlayerId,
    replaceName,
    setReplaceName,
    selectedReplacementId,
    addingNew,
    confirmReplace,
    setConfirmReplace,
    saving,
    leaveName,
    stayName,
    joinName,
    partners,
    resetReplace,
    openReplace: (playerId: string) => {
      if (params.selectedFresh?.midMatch) {
        params.setErrorText("Blocked mid-match. Finish or abandon the score first.");
        return;
      }
      setReplacePlayerId(playerId);
      setReplaceName("");
      setSelectedReplacementId(null);
      setAddingNew(false);
      setConfirmReplace(false);
    },
    selectReplacement: (playerId: string) => {
      setAddingNew(false);
      setSelectedReplacementId(playerId);
    },
    toggleAddingNew: () => {
      setSelectedReplacementId(null);
      setAddingNew((value) => !value);
    },
    submitReplace: async () => {
      if (!params.selectedFresh || !replacePlayerId) return;
      setSaving(true);
      try {
        params.setErrorText("");
        const hub = await replaceKohPartner(params.hub.id, params.selectedFresh.unit.id, {
          leavePlayerId: replacePlayerId,
          expectedVersion: params.hub.version,
          ...(addingNew
            ? { replacement: { name: replaceName.trim() } }
            : { replacementPlayerId: selectedReplacementId ?? "" })
        });
        params.setHub(hub);
        resetReplace();
        params.setSelected(null);
      } catch (error) {
        reportKohEditError(error, params.markEmailVerifyRequired, params.setErrorText);
      } finally {
        setSaving(false);
      }
    }
  };
}
