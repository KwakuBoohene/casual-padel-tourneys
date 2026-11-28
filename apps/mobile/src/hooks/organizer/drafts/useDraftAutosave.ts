import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { TournamentDraftPayload } from "@padel/shared";

import { createDraft, updateDraft, type DraftDetail } from "../../../api/drafts";
import { ApiError, isEmailVerifyRequired } from "../../../api/errors";
import { draftQueryKeys } from "../../../utilities/organizer/draftQueryKeys";

export const DRAFT_AUTOSAVE_DELAY_MS = 1500;
export type DraftSaveStatus = "idle" | "saving" | "saved" | "error" | "conflict";

interface Options {
  payload: TournamentDraftPayload;
  markEmailVerifyRequired: (dueAt?: number) => void;
}

/**
 * Persist the wizard as a draft. The first save is explicit (`saveNow`); after that, edits
 * autosave after a short pause. Saves run one at a time and always send the latest state.
 */
export function useDraftAutosave({ payload, markEmailVerifyRequired }: Options) {
  const queryClient = useQueryClient();
  const json = useMemo(() => JSON.stringify(payload), [payload]);
  const [draftId, setDraftId] = useState<string | null>(null);
  const [savedJson, setSavedJson] = useState<string | null>(null);
  const [status, setStatus] = useState<DraftSaveStatus>("idle");
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const [conflict, setConflict] = useState<DraftDetail | null>(null);
  const latest = useRef({ payload, json });
  const saved = useRef({ id: null as string | null, version: 0 });
  const queue = useRef<Promise<boolean>>(Promise.resolve(true));
  const attempted = useRef<string | null>(null);

  useEffect(() => {
    latest.current = { payload, json };
  }, [payload, json]);

  const saveOnce = useCallback(async (): Promise<boolean> => {
    const { payload: body, json: bodyJson } = latest.current;
    attempted.current = bodyJson;
    setStatus("saving");
    try {
      const result = saved.current.id
        ? await updateDraft(saved.current.id, body, saved.current.version)
        : await createDraft(body);
      saved.current = { id: result.id, version: result.version };
      setDraftId(result.id);
      setSavedJson(bodyJson);
      setLastSavedAt(new Date());
      setStatus("saved");
      void queryClient.invalidateQueries({ queryKey: draftQueryKeys.all });
      return true;
    } catch (error) {
      if (isEmailVerifyRequired(error)) markEmailVerifyRequired(error.verifyBy);
      if (error instanceof ApiError && error.code === "DRAFT_VERSION_CONFLICT") {
        setConflict((error.body?.latest as DraftDetail | undefined) ?? null);
        setStatus("conflict");
      } else {
        setStatus("error");
      }
      return false;
    }
  }, [markEmailVerifyRequired, queryClient]);

  const saveNow = useCallback(() => {
    queue.current = queue.current.then(saveOnce, saveOnce);
    return queue.current;
  }, [saveOnce]);

  /** Continue editing an existing draft; `baselineJson` is its payload as the wizard renders it. */
  const adopt = useCallback((draft: Pick<DraftDetail, "id" | "version">, baselineJson: string) => {
    saved.current = { id: draft.id, version: draft.version };
    setDraftId(draft.id);
    setSavedJson(baselineJson);
    setConflict(null);
    setStatus("idle");
  }, []);

  const dirty = savedJson !== json;
  useEffect(() => {
    if (!draftId || !dirty || status === "conflict" || status === "saving") return;
    // After a failed save, wait for the next edit (or an explicit save) instead of retrying in a loop.
    if (status === "error" && attempted.current === json) return;
    const timer = setTimeout(() => void saveNow(), DRAFT_AUTOSAVE_DELAY_MS);
    return () => clearTimeout(timer);
  }, [draftId, dirty, json, status, saveNow]);

  /** `baselineJson`: the payload as last saved or loaded — the "base" for conflict diffs. */
  return { draftId, status, lastSavedAt, conflict, dirty, baselineJson: savedJson, saveNow, adopt };
}
