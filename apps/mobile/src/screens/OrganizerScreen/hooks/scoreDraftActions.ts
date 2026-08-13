import type { Dispatch, SetStateAction } from "react";

import { apiPost } from "../../../api/client";
import type { LiveTournamentState, TournamentResponse } from "../types";

import type { ScoreDraftMap } from "./useScoreDraftPersistence";

export type LiveRound = LiveTournamentState["rounds"][number];
export type LiveMatch = LiveRound["matches"][number];
export type ScoreSide = "scoreA" | "scoreB";

function matchScoreText(match: LiveMatch | undefined, side: ScoreSide): string {
  const score = match?.[side];
  return score !== undefined ? String(score) : "";
}

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

export function applyPickedScore(input: {
  previous: ScoreDraftMap;
  existing: { scoreA: string; scoreB: string } | undefined;
  match: LiveMatch | undefined;
  matchId: string;
  side: ScoreSide;
  value: number;
  pointsPerMatch: number;
}): ScoreDraftMap {
  const { previous, existing, match, matchId, side, value, pointsPerMatch } = input;
  const oppositeSide: ScoreSide = side === "scoreA" ? "scoreB" : "scoreA";
  const currentA = existing?.scoreA ?? matchScoreText(match, "scoreA");
  const currentB = existing?.scoreB ?? matchScoreText(match, "scoreB");
  const bothFilledBefore = currentA.trim().length > 0 && currentB.trim().length > 0;
  const oppositeCurrent = oppositeSide === "scoreA" ? currentA : currentB;

  const next = {
    scoreA: previous[matchId]?.scoreA ?? matchScoreText(match, "scoreA"),
    scoreB: previous[matchId]?.scoreB ?? matchScoreText(match, "scoreB")
  };
  next[side] = String(value);
  if (!bothFilledBefore && oppositeCurrent.trim().length === 0) {
    next[oppositeSide] = String(Math.max(0, pointsPerMatch - value));
  }
  return { ...previous, [matchId]: next };
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
    return Number.isFinite(Number(raw?.scoreA ?? "")) && Number.isFinite(Number(raw?.scoreB ?? ""));
  });
  if (matchesWithScores.length === 0) {
    setErrorText("Enter valid numeric scores for at least one match in this round.");
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
