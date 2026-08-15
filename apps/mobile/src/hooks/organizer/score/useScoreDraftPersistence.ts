import { useEffect, useState } from "react";

import { logger } from "../../../logger";

import { deleteLocalValue, readLocalValue, writeLocalValue } from "../../../utilities/organizer/localValueStorage";

export type ScoreDraftMap = Record<string, { scoreA: string; scoreB: string }>;

export const scoreDraftStorageKey = (tournamentId: string) => `scoreDraft:${tournamentId}`;

export function useScoreDraftPersistence(tournamentId: string | undefined) {
  const [scoreInputs, setScoreInputs] = useState<ScoreDraftMap>({});
  const [scoreDraftHydratedTournamentId, setScoreDraftHydratedTournamentId] = useState<string | null>(null);

  useEffect(() => {
    if (!tournamentId) {
      setScoreInputs({});
      setScoreDraftHydratedTournamentId(null);
      return;
    }

    let cancelled = false;
    const loadDraftScores = async () => {
      try {
        const raw = await readLocalValue(scoreDraftStorageKey(tournamentId));
        if (cancelled) {
          return;
        }
        if (!raw) {
          setScoreInputs({});
          setScoreDraftHydratedTournamentId(tournamentId);
          return;
        }
        const parsed = JSON.parse(raw) as ScoreDraftMap;
        setScoreInputs(parsed ?? {});
      } catch (error) {
        logger.warn("loadDraftScores: failed to load local draft", { error, tournamentId });
        setScoreInputs({});
      } finally {
        if (!cancelled) {
          setScoreDraftHydratedTournamentId(tournamentId);
        }
      }
    };

    void loadDraftScores();

    return () => {
      cancelled = true;
    };
  }, [tournamentId]);

  useEffect(() => {
    if (!tournamentId || scoreDraftHydratedTournamentId !== tournamentId) {
      return;
    }

    const persistDraftScores = async () => {
      try {
        const hasDraftValues = Object.values(scoreInputs).some(
          (entry) => (entry?.scoreA ?? "").trim().length > 0 || (entry?.scoreB ?? "").trim().length > 0
        );
        const key = scoreDraftStorageKey(tournamentId);
        if (!hasDraftValues) {
          await deleteLocalValue(key);
          return;
        }
        await writeLocalValue(key, JSON.stringify(scoreInputs));
      } catch (error) {
        logger.warn("persistDraftScores: failed to persist local draft", { error, tournamentId });
      }
    };

    void persistDraftScores();
  }, [tournamentId, scoreDraftHydratedTournamentId, scoreInputs]);

  return { scoreInputs, setScoreInputs };
}
