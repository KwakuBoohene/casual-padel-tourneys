import { router } from "expo-router";
import { isKohDraftPayload } from "@padel/shared";

import { getDraft, type DraftDetail } from "../../api/drafts";
import { isEmailVerifyRequired } from "../../api/errors";
import { useOrganizerGa4 } from "../../components/analytics/OrganizerGa4";
import type { KohCreateStep } from "../../types/koh/create";
import { fromKohDraftPayload, hasKohDraftContent, kohResumeStep, toKohDraftPayload } from "../../utilities/koh/kohDraftPayload";
import { useDraftAutosave } from "../organizer/drafts/useDraftAutosave";
import { useDraftFlush } from "../organizer/drafts/useDraftFlush";
import { useDraftLeave } from "../organizer/drafts/useDraftLeave";
import type { useKohCreateWizard } from "./useKohCreateWizard";

type Wizard = ReturnType<typeof useKohCreateWizard>;

interface Options {
  markEmailVerifyRequired: (dueAt?: number) => void;
  setErrorText: (value: string) => void;
  /** Leave the wizard (list, or the draft overview when editing from there). */
  exit: () => void;
}

/** Save / autosave / resume / leave-prompt for the King of the Court create wizard (05b). */
export function useKohCreateDraft(wizard: Wizard, { markEmailVerifyRequired, setErrorText, exit }: Options) {
  const sendAnalytics = useOrganizerGa4();
  const autosave = useDraftAutosave({ payload: toKohDraftPayload(wizard.draft), markEmailVerifyRequired });
  useDraftFlush(autosave.flush);
  const hasContent = hasKohDraftContent(wizard.draft);
  // Same leave rules as the Americano/Mexicano wizard: never drop edits a failed save didn't keep.
  const leaving = useDraftLeave(autosave, { hasContent, exit });

  /** Show a server version in the wizard; `keepLocal` keeps my edits on top (re-saved next). */
  const restore = (draft: DraftDetail, step: KohCreateStep, keepLocal = false) => {
    if (!isKohDraftPayload(draft.payload)) return false;
    const restored = fromKohDraftPayload(draft.payload);
    if (!keepLocal) {
      wizard.setDraft(restored);
      wizard.setStep(step);
    }
    autosave.adopt(draft, JSON.stringify(toKohDraftPayload(restored)));
    return true;
  };

  const loadDraft = async (id: string, step?: KohCreateStep): Promise<boolean> => {
    try {
      const draft = await getDraft(id);
      return restore(draft, step ?? kohResumeStep(draft.readiness));
    } catch (error) {
      if (isEmailVerifyRequired(error)) markEmailVerifyRequired(error.verifyBy);
      else setErrorText((error as Error).message);
      return false;
    }
  };

  const latest = autosave.conflict;
  return {
    status: autosave.status,
    lastSavedAt: autosave.lastSavedAt,
    canSave: hasContent || Boolean(autosave.draftId),
    saveDraft: () => {
      void autosave.saveNow();
      sendAnalytics({ event: "draft_action", action: "saved" });
    },
    requestLeave: leaving.requestLeave,
    loadDraft,
    finish: autosave.draftId
      ? async () => {
          const id = autosave.draftId;
          if (id && (await autosave.saveNow()) === "saved") router.replace({ pathname: "/drafts/[id]", params: { id, start: "1" } });
        }
      : null,
    leaveSheet: leaving.leaveSheet,
    // KOH setups aren't diffed field by field: keep mine as a whole, or take theirs.
    conflictSheet: {
      visible: autosave.status === "conflict" && Boolean(latest),
      editorName: latest?.updatedBy.name ?? "A co-organizer",
      theirs: [{ field: "name" as const, label: "Changed the King of the Court setup" }],
      mine: [{ field: "name" as const, label: "Your unsaved edits", overwritesTheirs: true }],
      onReapply: () => {
        if (latest && restore(latest, wizard.step, true)) sendAnalytics({ event: "draft_action", action: "conflict_reapplied" });
      },
      onDrop: () => {
        if (latest && restore(latest, wizard.step)) sendAnalytics({ event: "draft_action", action: "conflict_dropped" });
      }
    }
  };
}
