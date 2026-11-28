import { createContext, useContext } from "react";

import type { DraftSaveStatus } from "../../../hooks/organizer/drafts/useDraftAutosave";

/** Lets every wizard step show "Save draft" without threading props through each step view. */
export interface CreateDraftContextValue {
  status: DraftSaveStatus;
  lastSavedAt: Date | null;
  canSave: boolean;
  saveDraft: () => void;
  requestLeave: () => void;
  /** Set once the wizard is a saved draft: Create goes to the draft's start confirmation. */
  finish: (() => Promise<void>) | null;
}

export const CreateDraftContext = createContext<CreateDraftContextValue | null>(null);

/** Null outside the Americano/Mexicano create wizard (e.g. King of the Court steps). */
export function useCreateDraftContext(): CreateDraftContextValue | null {
  return useContext(CreateDraftContext);
}
