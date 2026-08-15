import type { Dispatch, SetStateAction } from "react";

import type { LiveTournamentState } from "../../types/organizer/tournament";
import type { ScoreDraftMap } from "../../hooks/organizer/score/useScoreDraftPersistence";
import { regularMatchCanComplete } from "./regularScoreEntry";
import {
  persistRegularScoreEntry,
  persistScoreEntry,
  validateAmericanoScores,
  type ScoreEntryState
} from "./scoreEntryHelpers";

export async function runAmericanoScoreSave(input: {
  tournament: LiveTournamentState;
  entry: ScoreEntryState;
  points: number;
  onTournamentUpdated: (data: LiveTournamentState) => void;
  setScoreInputs: Dispatch<SetStateAction<ScoreDraftMap>>;
}): Promise<string | null> {
  const invalid = validateAmericanoScores(input.entry.scoreA, input.entry.scoreB, input.points);
  if (invalid) {
    return invalid;
  }
  await persistScoreEntry({
    tournament: input.tournament,
    matchId: input.entry.matchId,
    scoreA: input.entry.scoreA as number,
    scoreB: input.entry.scoreB as number,
    onTournamentUpdated: input.onTournamentUpdated,
    setScoreInputs: input.setScoreInputs
  });
  return null;
}

export async function runRegularScoreSave(input: {
  tournament: LiveTournamentState;
  entry: ScoreEntryState;
  complete: boolean;
  onTournamentUpdated: (data: LiveTournamentState) => void;
}): Promise<string | null> {
  const config = input.tournament.config.regularScoring;
  if (!config) {
    return "Tournament is missing Regular scoring rules.";
  }
  if (
    input.complete &&
    !regularMatchCanComplete(input.entry.sets, config, {
      a: input.entry.matchTbA,
      b: input.entry.matchTbB
    })
  ) {
    return "Finish the set rules before completing the match.";
  }
  await persistRegularScoreEntry({
    tournament: input.tournament,
    matchId: input.entry.matchId,
    sets: input.entry.sets,
    complete: input.complete,
    matchTbA: input.entry.matchTbA,
    matchTbB: input.entry.matchTbB,
    onTournamentUpdated: input.onTournamentUpdated
  });
  return null;
}
