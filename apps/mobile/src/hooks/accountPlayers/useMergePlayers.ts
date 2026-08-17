import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import type { OrganizerManagedPlayer } from "@padel/shared";

import { mergeAccountPlayers } from "../../api/accountPlayers";
import { isEmailVerifyRequired } from "../../api/errors";
import { tournamentQueryKeys } from "../../utilities/organizer/tournamentQueryKeys";

export function useMergePlayers(params: {
  setErrorText: (value: string) => void;
  markEmailVerifyRequired: (dueAt?: number) => void;
  onMerged: () => Promise<void>;
}) {
  const queryClient = useQueryClient();
  const [picking, setPicking] = useState(false);
  const [playerA, setPlayerA] = useState<OrganizerManagedPlayer | null>(null);
  const [playerB, setPlayerB] = useState<OrganizerManagedPlayer | null>(null);
  const [survivingName, setSurvivingName] = useState("");
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);

  const reset = () => {
    setPicking(false);
    setPlayerA(null);
    setPlayerB(null);
    setSurvivingName("");
    setConfirming(false);
  };

  const selectPlayer = (player: OrganizerManagedPlayer) => {
    if (playerA?.id === player.id) {
      setPlayerA(null);
      return;
    }
    if (playerB?.id === player.id) {
      setPlayerB(null);
      return;
    }
    if (!playerA) {
      setPlayerA(player);
      return;
    }
    if (!playerB) setPlayerB(player);
  };

  const beginConfirm = () => {
    if (!playerA || !playerB) return;
    setSurvivingName(playerA.name);
    setPicking(false);
    setConfirming(true);
  };

  const confirmMerge = async () => {
    if (!playerA || !playerB || !survivingName.trim()) return;
    setBusy(true);
    try {
      await mergeAccountPlayers({
        playerIdA: playerA.id,
        playerIdB: playerB.id,
        survivingName: survivingName.trim()
      });
      reset();
      await queryClient.invalidateQueries({ queryKey: tournamentQueryKeys.playerSuggestions() });
      await params.onMerged();
    } catch (error) {
      if (isEmailVerifyRequired(error)) params.markEmailVerifyRequired(error.verifyBy);
      else params.setErrorText((error as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return {
    picking,
    setPicking,
    playerA,
    playerB,
    survivingName,
    setSurvivingName,
    confirming,
    setConfirming,
    busy,
    reset,
    selectPlayer,
    beginConfirm,
    confirmMerge
  };
}
