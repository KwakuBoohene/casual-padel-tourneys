import { useState } from "react";

import type { LeaveWizardSheetProps } from "../../../components/organizer/create/LeaveWizardSheet";
import type { useDraftAutosave } from "./useDraftAutosave";

type Autosave = ReturnType<typeof useDraftAutosave>;
type Prompt = LeaveWizardSheetProps["variant"];

interface Options {
  /** Something worth keeping was entered in a wizard that has never been saved. */
  hasContent: boolean;
  exit: () => void;
}

/**
 * Backing out of the wizard. A saved draft flushes first and only leaves once that worked;
 * if it didn't, the organizer decides (retry, keep editing, or leave without the last edits).
 */
export function useDraftLeave(autosave: Autosave, { hasContent, exit }: Options) {
  const [prompt, setPrompt] = useState<Prompt | null>(null);
  const [variant, setVariant] = useState<Prompt>("unsaved");
  const [busy, setBusy] = useState(false);

  const ask = (next: Prompt) => {
    setVariant(next);
    setPrompt(next);
  };
  const leave = () => {
    setPrompt(null);
    exit();
  };

  const saveThenLeave = async (onFailure: Prompt) => {
    setBusy(true);
    const result = await autosave.saveNow();
    setBusy(false);
    // `gone`: nothing left to save into. `conflict`: the conflict sheet takes over.
    if (result === "saved" || result === "gone") leave();
    else if (result === "failed") ask(onFailure);
    else setPrompt(null);
  };

  const requestLeave = () => {
    if (autosave.draftId) void saveThenLeave("unsynced");
    else if (hasContent) ask("unsaved");
    else leave();
  };

  const leaveSheet: LeaveWizardSheetProps = {
    visible: prompt !== null,
    variant,
    busy,
    failed: autosave.status === "error",
    actions: {
      onSave: () => void saveThenLeave(variant),
      onKeepEditing: () => setPrompt(null),
      onDiscard: leave
    }
  };
  return { requestLeave, leaveSheet };
}
