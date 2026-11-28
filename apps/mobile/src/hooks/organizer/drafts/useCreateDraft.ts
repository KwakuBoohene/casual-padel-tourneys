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
  toDraftPayload,
  type DraftWizardSnapshot
} from "../../../utilities/organizer/draftPayload";
import type { CreateWizardStep, useCreateTournament } from "../useCreateTournament";
import { useDraftAutosave } from "./useDraftAutosave";
import { useDraftConflict } from "./useDraftConflict";
import { useDraftFlush } from "./useDraftFlush";
import { useDraftLeave } from "./useDraftLeave";

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
  // Match settings only count as chosen once the organizer has seen them (Mexicano has no
  // scoring question, so reaching the step is enough).
  const [settingsChosen, setSettingsChosen] = useState(false);
  const onSettings =
    create.wizardStep === "SETTINGS" && (create.mode === "MEXICANO" || create.settingsPhase === "DETAILS");
  if (onSettings && !settingsChosen) setSettingsChosen(true);

  const snapshot = snapshotFromCreate(create, settingsChosen || onSettings);
  const payload = toDraftPayload(snapshot);
  const autosave = useDraftAutosave({ payload, markEmailVerifyRequired });
  useDraftFlush(autosave.flush);

  /** Put a saved payload into the wizard (resume, or after resolving a conflict). */
  const restore = (restored: DraftWizardSnapshot, step: CreateWizardStep) => {
    applyDraftSnapshot(create, restored, step);
    setSettingsChosen(restored.settingsChosen);
  };
  const conflictSheet = useDraftConflict({ step: create.wizardStep, restore }, autosave, payload);
  const hasContent = hasDraftContent(snapshot);
  const leaving = useDraftLeave(autosave, { hasContent, exit: exit ?? create.cancelCreateToList });

  /** Load an existing draft into the wizard. Returns false for drafts this wizard can't edit. */
  const loadDraft = async (id: string, step?: CreateWizardStep): Promise<boolean> => {
    try {
      const draft = await getDraft(id);
      if (draft.payload.mode !== "AMERICANO" && draft.payload.mode !== "MEXICANO") return false;
      const restored = fromDraftPayload(draft.payload);
      restore(restored, step ?? resumeStepFor(draft.readiness));
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
          if (id && (await autosave.saveNow()) === "saved") {
            router.replace({ pathname: "/drafts/[id]", params: { id, start: "1" } });
          }
        }
      : null,
    conflictSheet,
    requestLeave: leaving.requestLeave,
    loadDraft,
    leaveSheet: leaving.leaveSheet
  };
}

export type CreateDraftController = ReturnType<typeof useCreateDraft>;
