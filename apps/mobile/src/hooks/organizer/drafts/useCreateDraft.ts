import { useState } from "react";

import { getDraft } from "../../../api/drafts";
import { isEmailVerifyRequired } from "../../../api/errors";
import { applyDraftSnapshot, snapshotFromCreate } from "../../../utilities/organizer/createDraftSnapshot";
import {
  fromDraftPayload,
  hasDraftContent,
  resumeStepFor,
  toDraftPayload
} from "../../../utilities/organizer/draftPayload";
import type { useCreateTournament } from "../useCreateTournament";
import { useDraftAutosave } from "./useDraftAutosave";

type Create = ReturnType<typeof useCreateTournament>;

interface Options {
  markEmailVerifyRequired: (dueAt?: number) => void;
  setErrorText: (value: string) => void;
}

/** Save / autosave / resume / leave-prompt for the Americano/Mexicano create wizard. */
export function useCreateDraft(create: Create, { markEmailVerifyRequired, setErrorText }: Options) {
  const snapshot = snapshotFromCreate(create);
  const autosave = useDraftAutosave({ payload: toDraftPayload(snapshot), markEmailVerifyRequired });
  const [leaveOpen, setLeaveOpen] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const hasContent = hasDraftContent(snapshot);

  const leave = () => {
    setLeaveOpen(false);
    create.cancelCreateToList();
  };

  /** Back out of the wizard: saved drafts flush silently; unsaved work asks first. */
  const requestLeave = () => {
    if (autosave.draftId) {
      setLeaving(true);
      void autosave.saveNow().finally(() => {
        setLeaving(false);
        leave();
      });
      return;
    }
    if (hasContent) setLeaveOpen(true);
    else leave();
  };

  const saveAndLeave = async () => {
    setLeaving(true);
    const ok = await autosave.saveNow();
    setLeaving(false);
    if (ok) leave();
  };

  /** Load an existing draft into the wizard. Returns false for drafts this wizard can't edit. */
  const loadDraft = async (id: string): Promise<boolean> => {
    try {
      const draft = await getDraft(id);
      if (draft.payload.mode !== "AMERICANO" && draft.payload.mode !== "MEXICANO") return false;
      const restored = fromDraftPayload(draft.payload);
      applyDraftSnapshot(create, restored, resumeStepFor(draft.readiness));
      autosave.adopt(draft, JSON.stringify(toDraftPayload(restored)));
      return true;
    } catch (error) {
      if (isEmailVerifyRequired(error)) markEmailVerifyRequired(error.verifyBy);
      else setErrorText((error as Error).message);
      return false;
    }
  };

  return {
    draftId: autosave.draftId,
    status: autosave.status,
    lastSavedAt: autosave.lastSavedAt,
    conflict: autosave.conflict,
    canSave: hasContent || Boolean(autosave.draftId),
    saveDraft: () => void autosave.saveNow(),
    requestLeave,
    loadDraft,
    leaveSheet: {
      visible: leaveOpen,
      busy: leaving,
      failed: autosave.status === "error",
      onSave: () => void saveAndLeave(),
      onKeepEditing: () => setLeaveOpen(false),
      onDiscard: leave
    }
  };
}

export type CreateDraftController = ReturnType<typeof useCreateDraft>;
