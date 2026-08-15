import { useMemo } from "react";

import type { LiveTournamentState } from "../../../types/organizer/tournament";
import {
  canIncrementRegularSide,
  isRegularTournament,
  regularConfigOf,
  regularContextLine,
  regularMatchCanComplete
} from "../../../utilities/organizer/regularScoreEntry";
import type { ScoreEntryState } from "../../../utilities/organizer/scoreEntryHelpers";

export function useScoreEntryMeta(
  liveTournament: LiveTournamentState | null,
  scoreEntry: ScoreEntryState | null
) {
  const regular = liveTournament ? isRegularTournament(liveTournament) : false;
  const regularConfig = liveTournament ? regularConfigOf(liveTournament) : null;

  return useMemo(() => {
    const canComplete = Boolean(
      regular &&
        regularConfig &&
        scoreEntry &&
        regularMatchCanComplete(scoreEntry.sets, regularConfig, {
          a: scoreEntry.matchTbA,
          b: scoreEntry.matchTbB
        })
    );
    return {
      regular,
      regularConfig,
      canComplete,
      contextLine:
        regular && regularConfig && scoreEntry
          ? regularContextLine(scoreEntry.sets, regularConfig)
          : null,
      plusDisabledA:
        regular && regularConfig && scoreEntry
          ? !canIncrementRegularSide(scoreEntry.sets, regularConfig, "A")
          : false,
      plusDisabledB:
        regular && regularConfig && scoreEntry
          ? !canIncrementRegularSide(scoreEntry.sets, regularConfig, "B")
          : false
    };
  }, [regular, regularConfig, scoreEntry]);
}
