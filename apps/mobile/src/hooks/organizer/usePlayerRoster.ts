import { useMemo, useState } from "react";
import type { PlayerGender, TournamentVariant } from "@padel/shared";

import type { TournamentListResponse } from "../../types/organizer/tournament";

export interface UsePlayerRosterParams {
  variant: TournamentVariant;
  tournaments: TournamentListResponse["data"];
  suggestedPlayerNames: string[];
}

export function usePlayerRoster({ variant, tournaments, suggestedPlayerNames }: UsePlayerRosterParams) {
  const [players, setPlayers] = useState<string[]>([]);
  const [playerGenders, setPlayerGenders] = useState<Array<PlayerGender | undefined>>([]);

  const sanitizedPlayers = useMemo(() => players.map((value) => value.trim()).filter(Boolean), [players]);

  const hasDuplicatePlayerNames = useMemo(() => {
    const filled = players.map((p) => p.trim()).filter(Boolean);
    return new Set(filled.map((s) => s.toLowerCase())).size !== filled.length;
  }, [players]);

  const canContinueFromPlayers = useMemo(() => {
    if (sanitizedPlayers.length < 4) return false;
    if (hasDuplicatePlayerNames) return false;
    if (variant !== "MIXED") return true;
    return players.every((value, index) => value.trim().length === 0 || Boolean(playerGenders[index]));
  }, [hasDuplicatePlayerNames, playerGenders, players, sanitizedPlayers.length, variant]);

  const allKnownPlayerNames = useMemo(() => {
    const names = new Set<string>();
    for (const suggestion of suggestedPlayerNames) {
      if (suggestion.trim()) names.add(suggestion.trim());
    }
    for (const tournament of tournaments) {
      for (const player of tournament.players) {
        if (player.name.trim()) names.add(player.name.trim());
      }
    }
    for (const playerName of players) {
      if (playerName.trim()) names.add(playerName.trim());
    }
    return Array.from(names).sort((a, b) => a.localeCompare(b));
  }, [players, suggestedPlayerNames, tournaments]);

  const addPlayer = (name: string, gender?: PlayerGender) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    setPlayers((previous) => [...previous, trimmed]);
    setPlayerGenders((previous) => [...previous, gender]);
  };

  const updatePlayer = (index: number, name: string, gender?: PlayerGender) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    setPlayers((previous) => previous.map((item, i) => (i === index ? trimmed : item)));
    setPlayerGenders((previous) => previous.map((item, i) => (i === index ? gender : item)));
  };

  const removePlayerInput = (index: number) => {
    setPlayers((previous) => previous.filter((_, i) => i !== index));
    setPlayerGenders((previous) => previous.filter((_, i) => i !== index));
  };

  const selectSuggestion = (name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    if (players.some((p) => p.trim().toLowerCase() === trimmed.toLowerCase())) return;
    addPlayer(trimmed, undefined);
  };

  return {
    players,
    playerGenders,
    sanitizedPlayers,
    hasDuplicatePlayerNames,
    canContinueFromPlayers,
    allKnownPlayerNames,
    addPlayer,
    updatePlayer,
    removePlayerInput,
    selectSuggestion,
    updatePlayerName: (index: number, value: string) =>
      setPlayers((previous) => previous.map((item, i) => (i === index ? value : item))),
    updatePlayerGender: (index: number, value: PlayerGender) =>
      setPlayerGenders((previous) => previous.map((item, i) => (i === index ? value : item)))
  };
}
