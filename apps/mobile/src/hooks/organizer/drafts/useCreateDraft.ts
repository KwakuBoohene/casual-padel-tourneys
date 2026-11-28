import { router } from "expo-router";
import { useState } from "react";

import { getDraft } from "../../../api/drafts";
import { isEmailVerifyRequired } from "../../../api/errors";
import { useOrganizerGa4 } from "../../../components/analytics/OrganizerGa4";
import { applyDraftSnapshot, snapshotFromCreate } from "../../../utilities/organizer/createDraftSnapshot";
import {
  fromDraftPayload,
  hasDraftContent,
  resumeStepFor,
  toDraftPayload
} from "../../../utilities/organizer/draftPayload";
import type { CreateWizardStep, useCreateTournament } from "../useCreateTournament";
import { useDraftAutosave } from "./useDraftAutosave";
import { useDraftConflict } from "./useDraftConflict";

type Create = ReturnType<typeof useCreateTournament>;

interface Options {
  markEmailVerifyRequired: (dueAt?: number) => void;
  setErrorText: (value: string) => void;
  /** Where Back goes once the wizard is done (e.g. the draft overview); defaults to the list. */
  exit?: () => void;
}

/** Save / autosave / resume / leave-prompt for the Americano/Mexicano create wizard. */
export function useCreateDraft(create: Create, { markEmailVerifyRequired, setErrorText, exit }: Options) {
  const sendAnalytics = useOrganizerGa4();
  const snapshot = snapshotFromCreate(create);
  const payload = toDraftPayload(snapshot);
  const autosave = useDraftAutosave({ payload, markEmailVerifyRequired });
  const conflictSheet = useDraftConflict(create, autosave, payload);
  const [leaveOpen, setLeaveOpen] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const hasContent = hasDraftContent(snapshot);

  const leave = () => {
    setLeaveOpen(false);
    if (exit) exit();
    else create.cancelCreateToList();
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
  const loadDraft = async (id: string, step?: CreateWizardStep): Promise<boolean> => {
    try {
      const draft = await getDraft(id);
      if (draft.payload.mode !== "AMERICANO" && draft.payload.mode !== "MEXICANO") return false;
      const restored = fromDraftPayload(draft.payload);
      applyDraftSnapshot(create, restored, step ?? resumeStepFor(draft.readiness));
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
    saveDraft: () => {
      void autosave.saveNow();
      sendAnalytics({ event: "draft_action", action: "saved" });
    },
    /** Saved drafts finish on the overview's start confirmation instead of creating a second copy. */
    finish: autosave.draftId
      ? async () => {
          const id = autosave.draftId;
          if (id && (await autosave.saveNow())) router.replace({ pathname: "/drafts/[id]", params: { id, start: "1" } });
        }
      : null,
    conflictSheet,
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
