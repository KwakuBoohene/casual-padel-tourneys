import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { TournamentDraftPayload } from "@padel/shared";

import { createDraft, updateDraft, type DraftDetail } from "../../../api/drafts";
import { ApiError, isEmailVerifyRequired } from "../../../api/errors";
import { draftQueryKeys } from "../../../utilities/organizer/draftQueryKeys";

export const DRAFT_AUTOSAVE_DELAY_MS = 1500;
/** `gone`: the draft was deleted or started elsewhere, so saving can never work again. */
export type DraftSaveStatus = "idle" | "saving" | "saved" | "error" | "conflict" | "gone";
export type DraftSaveResult = "saved" | "failed" | "conflict" | "gone";

interface Options {
  payload: TournamentDraftPayload;
  markEmailVerifyRequired: (dueAt?: number) => void;
}

const failureOf = (error: unknown): Exclude<DraftSaveResult, "saved"> => {
  if (!(error instanceof ApiError)) return "failed";
  if (error.code === "DRAFT_VERSION_CONFLICT") return "conflict";
  return error.status === 404 || error.code === "DRAFT_ALREADY_STARTED" ? "gone" : "failed";
};
const STATUS = { failed: "error", conflict: "conflict", gone: "gone" } as const;

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
  const saved = useRef({ id: null as string | null, version: 0, json: null as string | null, gone: false });
  const queue = useRef<Promise<DraftSaveResult>>(Promise.resolve("saved"));
  const attempted = useRef<string | null>(null);

  useEffect(() => {
    latest.current = { payload, json };
  }, [payload, json]);

  const saveOnce = useCallback(
    async (keepalive: boolean): Promise<DraftSaveResult> => {
      const { payload: body, json: bodyJson } = latest.current;
      const { id, version } = saved.current;
      if (saved.current.gone) return "gone";
      // Unchanged since the last save: a write would only bump the version and make a
      // co-organizer's next save look like a conflict.
      if (id && saved.current.json === bodyJson) return "saved";
      attempted.current = bodyJson;
      setStatus("saving");
      try {
        const result = id ? await updateDraft(id, body, version, { keepalive }) : await createDraft(body);
        saved.current = { id: result.id, version: result.version, json: bodyJson, gone: false };
        setDraftId(result.id);
        setSavedJson(bodyJson);
        setLastSavedAt(new Date());
        setStatus("saved");
        void queryClient.invalidateQueries({ queryKey: draftQueryKeys.all });
        return "saved";
      } catch (error) {
        if (isEmailVerifyRequired(error)) markEmailVerifyRequired(error.verifyBy);
        const failure = failureOf(error);
        if (failure === "conflict") setConflict(((error as ApiError).body?.latest as DraftDetail | undefined) ?? null);
        if (failure === "gone") saved.current.gone = true;
        setStatus(STATUS[failure]);
        return failure;
      }
    },
    [markEmailVerifyRequired, queryClient]
  );

  const saveNow = useCallback(
    (keepalive = false) => {
      const run = () => saveOnce(keepalive);
      queue.current = queue.current.then(run, run);
      return queue.current;
    },
    [saveOnce]
  );

  /** Best-effort save of unsaved edits when the screen is going away (never creates a draft). */
  const flush = useCallback(() => {
    const { id, json: savedBody, gone } = saved.current;
    if (id && !gone && savedBody !== latest.current.json) void saveNow(true);
  }, [saveNow]);

  /** Continue editing an existing draft; `baselineJson` is its payload as the wizard renders it. */
  const adopt = useCallback((draft: Pick<DraftDetail, "id" | "version">, baselineJson: string) => {
    saved.current = { id: draft.id, version: draft.version, json: baselineJson, gone: false };
    setDraftId(draft.id);
    setSavedJson(baselineJson);
    setConflict(null);
    setStatus("idle");
  }, []);

  const dirty = savedJson !== json;
  useEffect(() => {
    if (!draftId || !dirty || status === "conflict" || status === "saving" || status === "gone") return;
    // After a failed save, wait for the next edit (or an explicit save) instead of retrying in a loop.
    if (status === "error" && attempted.current === json) return;
    const timer = setTimeout(() => void saveNow(), DRAFT_AUTOSAVE_DELAY_MS);
    return () => clearTimeout(timer);
  }, [draftId, dirty, json, status, saveNow]);

  /** `baselineJson`: the payload as last saved or loaded — the "base" for conflict diffs. */
  return { draftId, status, lastSavedAt, conflict, dirty, baselineJson: savedJson, saveNow, flush, adopt };
}
