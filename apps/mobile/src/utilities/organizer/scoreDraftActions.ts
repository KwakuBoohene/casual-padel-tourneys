import type { Dispatch, SetStateAction } from "react";
import type { MatchSet } from "@padel/shared";

import { apiPost } from "../../api/client";
import type { LiveTournamentState, TournamentResponse } from "../../types/organizer/tournament";

import type { ScoreDraftMap } from "../../hooks/organizer/score/useScoreDraftPersistence";

export type LiveRound = LiveTournamentState["rounds"][number];
export type LiveMatch = LiveRound["matches"][number];
export type ScoreSide = "scoreA" | "scoreB";

export function findMatchInTournament(
  tournament: LiveTournamentState,
  matchId: string
): LiveMatch | undefined {
  for (const round of tournament.rounds) {
    const found = round.matches.find((match) => match.id === matchId);
    if (found) {
      return found;
    }
  }
  return undefined;
}

export async function submitMatchScore(params: {
  tournament: LiveTournamentState;
  matchId: string;
  scoreA: number;
  scoreB: number;
  onTournamentUpdated: (data: LiveTournamentState) => void;
}): Promise<LiveTournamentState> {
  const response = await apiPost<TournamentResponse>("/tournaments/score", {
    tournamentId: params.tournament.id,
    matchId: params.matchId,
    scoreA: params.scoreA,
    scoreB: params.scoreB,
    expectedVersion: params.tournament.version
  });
  params.onTournamentUpdated(response.data);
  return response.data;
}

export async function submitRegularMatchScore(params: {
  tournament: LiveTournamentState;
  matchId: string;
  sets: MatchSet[];
  status: "DRAFT" | "COMPLETE";
  matchTbA?: number;
  matchTbB?: number;
  onTournamentUpdated: (data: LiveTournamentState) => void;
}): Promise<LiveTournamentState> {
  const response = await apiPost<TournamentResponse>("/tournaments/score", {
    tournamentId: params.tournament.id,
    matchId: params.matchId,
    sets: params.sets,
    status: params.status,
    matchTbA: params.matchTbA,
    matchTbB: params.matchTbB,
    expectedVersion: params.tournament.version
  });
  params.onTournamentUpdated(response.data);
  return response.data;
}

export async function submitRoundScoreDrafts(params: {
  tournament: LiveTournamentState;
  round: LiveRound;
  scoreInputs: ScoreDraftMap;
  setScoreInputs: Dispatch<SetStateAction<ScoreDraftMap>>;
  onTournamentUpdated: (data: LiveTournamentState) => void;
  setErrorText: (value: string) => void;
}): Promise<void> {
  const { tournament, round, scoreInputs, setScoreInputs, onTournamentUpdated, setErrorText } = params;
  const matchesWithScores = round.matches.filter((match) => {
    const raw = scoreInputs[match.id];
    const scoreA = raw?.scoreA?.trim() ?? "";
    const scoreB = raw?.scoreB?.trim() ?? "";
    return scoreA.length > 0 && scoreB.length > 0 && Number.isFinite(Number(scoreA)) && Number.isFinite(Number(scoreB));
  });
  if (matchesWithScores.length === 0) {
    setErrorText("Enter scores for at least one match before submitting the round.");
    return;
  }

  let version = tournament.version;
  setErrorText("");
  for (const match of matchesWithScores) {
    const raw = scoreInputs[match.id]!;
    try {
      const response = await apiPost<TournamentResponse>("/tournaments/score", {
        tournamentId: tournament.id,
        matchId: match.id,
        scoreA: Number(raw.scoreA),
        scoreB: Number(raw.scoreB),
        expectedVersion: version
      });
      onTournamentUpdated(response.data);
      setScoreInputs((previous) => {
        const next = { ...previous };
        delete next[match.id];
        return next;
      });
      version = response.data.version;
    } catch (error) {
      setErrorText((error as Error).message);
      return;
    }
  }
}
