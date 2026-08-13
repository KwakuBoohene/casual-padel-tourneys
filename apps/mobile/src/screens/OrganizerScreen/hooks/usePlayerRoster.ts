import { useMemo, useState } from "react";
import type { PlayerGender, TournamentVariant } from "@padel/shared";

import type { TournamentListResponse } from "../types";

export interface UsePlayerRosterParams {
  variant: TournamentVariant;
  tournaments: TournamentListResponse["data"];
  suggestedPlayerNames: string[];
}

export function usePlayerRoster({ variant, tournaments, suggestedPlayerNames }: UsePlayerRosterParams) {
  const [players, setPlayers] = useState<string[]>(["", "", "", ""]);
  const [playerGenders, setPlayerGenders] = useState<Array<PlayerGender | undefined>>([
    undefined,
    undefined,
    undefined,
    undefined
  ]);

  const sanitizedPlayers = useMemo(() => players.map((value) => value.trim()).filter(Boolean), [players]);

  const hasDuplicatePlayerNames = useMemo(() => {
    const filled = players.map((p) => p.trim()).filter(Boolean);
    return new Set(filled.map((s) => s.toLowerCase())).size !== filled.length;
  }, [players]);

  const canContinueFromPlayers = useMemo(() => {
    if (sanitizedPlayers.length < 4) {
      return false;
    }
    if (hasDuplicatePlayerNames) {
      return false;
    }
    if (variant !== "MIXED") {
      return true;
    }
    return players.every((value, index) => value.trim().length === 0 || Boolean(playerGenders[index]));
  }, [hasDuplicatePlayerNames, playerGenders, players, sanitizedPlayers.length, variant]);

  const allKnownPlayerNames = useMemo(() => {
    const names = new Set<string>();
    for (const suggestion of suggestedPlayerNames) {
      if (suggestion.trim().length > 0) {
        names.add(suggestion.trim());
      }
    }
    for (const tournament of tournaments) {
      for (const player of tournament.players) {
        if (player.name.trim().length > 0) {
          names.add(player.name.trim());
        }
      }
    }
    for (const playerName of players) {
      const trimmed = playerName.trim();
      if (trimmed.length > 0) {
        names.add(trimmed);
      }
    }
    return Array.from(names).sort((a, b) => a.localeCompare(b));
  }, [players, suggestedPlayerNames, tournaments]);

  const addPlayerInput = () => {
    setPlayers((previous) => [...previous, ""]);
    setPlayerGenders((previous) => [...previous, undefined]);
  };

  const removePlayerInput = (index: number) => {
    setPlayers((previous) => previous.filter((_, itemIndex) => itemIndex !== index));
    setPlayerGenders((previous) => previous.filter((_, itemIndex) => itemIndex !== index));
  };

  const selectSuggestion = (name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    const emptyIndex = players.findIndex((p) => p.trim() === "");
    if (emptyIndex >= 0) {
      setPlayers((previous) => {
        const next = [...previous];
        next[emptyIndex] = trimmed;
        return next;
      });
    } else {
      setPlayers((previous) => [...previous, trimmed]);
      setPlayerGenders((previous) => [...previous, undefined]);
    }
  };

  return {
    players,
    playerGenders,
    sanitizedPlayers,
    hasDuplicatePlayerNames,
    canContinueFromPlayers,
    allKnownPlayerNames,
    addPlayerInput,
    removePlayerInput,
    selectSuggestion,
    updatePlayerName: (index: number, value: string) =>
      setPlayers((previous) => previous.map((item, itemIndex) => (itemIndex === index ? value : item))),
    updatePlayerGender: (index: number, value: PlayerGender) =>
      setPlayerGenders((previous) => previous.map((item, itemIndex) => (itemIndex === index ? value : item)))
  };
}
