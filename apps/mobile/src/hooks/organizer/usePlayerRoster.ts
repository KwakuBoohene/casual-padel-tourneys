import { useMemo, useState } from "react";
import type { PlayerGender, TournamentMode, TournamentVariant } from "@padel/shared";
import { MEXICANO_MIN_PLAYERS, MEXICANO_MIN_TEAMS } from "@padel/shared";

import type { TournamentListResponse } from "../../types/organizer/tournament";

export interface TeamPairDraft {
  playerA: string;
  playerB: string;
}

export interface UsePlayerRosterParams {
  mode: TournamentMode;
  variant: TournamentVariant;
  tournaments: TournamentListResponse["data"];
  suggestedPlayerNames: string[];
}

export function usePlayerRoster({
  mode,
  variant,
  tournaments,
  suggestedPlayerNames
}: UsePlayerRosterParams) {
  const [players, setPlayers] = useState<string[]>([]);
  const [playerGenders, setPlayerGenders] = useState<(PlayerGender | undefined)[]>([]);
  const [teams, setTeams] = useState<TeamPairDraft[]>([]);
  const isTeamMexicano = mode === "MEXICANO" && variant === "TEAM";
  const minPlayers = mode === "MEXICANO" ? MEXICANO_MIN_PLAYERS : 4;
  const minTeams = MEXICANO_MIN_TEAMS;

  const sanitizedPlayers = useMemo(() => {
    if (isTeamMexicano) {
      return teams.flatMap((team) => [team.playerA.trim(), team.playerB.trim()]).filter(Boolean);
    }
    return players.map((value) => value.trim()).filter(Boolean);
  }, [isTeamMexicano, players, teams]);

  const hasDuplicatePlayerNames = useMemo(() => {
    const filled = sanitizedPlayers;
    return new Set(filled.map((s) => s.toLowerCase())).size !== filled.length;
  }, [sanitizedPlayers]);

  const canContinueFromPlayers = useMemo(() => {
    if (hasDuplicatePlayerNames) return false;
    if (isTeamMexicano) {
      return (
        teams.length >= minTeams &&
        teams.every((team) => team.playerA.trim().length > 0 && team.playerB.trim().length > 0)
      );
    }
    if (sanitizedPlayers.length < minPlayers) return false;
    if (variant !== "MIXED") return true;
    return players.every((value, index) => value.trim().length === 0 || Boolean(playerGenders[index]));
  }, [
    hasDuplicatePlayerNames,
    isTeamMexicano,
    minPlayers,
    minTeams,
    playerGenders,
    players,
    sanitizedPlayers.length,
    teams,
    variant
  ]);

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
    for (const playerName of sanitizedPlayers) {
      if (playerName.trim()) names.add(playerName.trim());
    }
    return Array.from(names).sort((a, b) => a.localeCompare(b));
  }, [sanitizedPlayers, suggestedPlayerNames, tournaments]);

  const addPlayer = (name: string, gender?: PlayerGender) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    setPlayers((previous) => [...previous, trimmed]);
    setPlayerGenders((previous) => [...previous, gender]);
  };

  const addTeam = (playerA: string, playerB: string) => {
    const a = playerA.trim();
    const b = playerB.trim();
    if (!a || !b) return;
    setTeams((previous) => [...previous, { playerA: a, playerB: b }]);
  };

  const updateTeam = (index: number, playerA: string, playerB: string) => {
    const a = playerA.trim();
    const b = playerB.trim();
    if (!a || !b) return;
    setTeams((previous) => previous.map((item, i) => (i === index ? { playerA: a, playerB: b } : item)));
  };

  const removeTeam = (index: number) => {
    setTeams((previous) => previous.filter((_, i) => i !== index));
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
    if (sanitizedPlayers.some((p) => p.trim().toLowerCase() === trimmed.toLowerCase())) return;
    addPlayer(trimmed, undefined);
  };

  return {
    players: isTeamMexicano ? sanitizedPlayers : players,
    playerGenders,
    teams,
    isTeamMexicano,
    sanitizedPlayers,
    minPlayers,
    minTeams,
    hasDuplicatePlayerNames,
    canContinueFromPlayers,
    allKnownPlayerNames,
    addPlayer,
    addTeam,
    updateTeam,
    removeTeam,
    updatePlayer,
    removePlayerInput,
    selectSuggestion,
    updatePlayerName: (index: number, value: string) =>
      setPlayers((previous) => previous.map((item, i) => (i === index ? value : item))),
    updatePlayerGender: (index: number, value: PlayerGender) =>
      setPlayerGenders((previous) => previous.map((item, i) => (i === index ? value : item)))
  };
}
