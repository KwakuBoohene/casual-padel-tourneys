import { assignKohCourts, createKohTournament } from "../../api/koh";
import { isEmailVerifyRequired } from "../../api/errors";
import type { KohCreateDraft, KohTournamentHub } from "../../types/koh/create";
import { courtsReadyToStart, hasDuplicatePlayerNames } from "./createDraft";
import { buildAssignPayload, buildCreatePayload } from "./createPayload";

export async function submitKohCreate(
  draft: KohCreateDraft,
  handlers: {
    setErrorText: (value: string) => void;
    markEmailVerifyRequired: (dueAt?: number) => void;
    onStarted: (hub: KohTournamentHub) => void;
  }
): Promise<void> {
  if (!courtsReadyToStart(draft.courtUnits) || hasDuplicatePlayerNames(draft.courtUnits)) {
    handlers.setErrorText("Each court needs at least 2 doubles pairs with unique players.");
    return;
  }
  try {
    handlers.setErrorText("");
    const created = await createKohTournament(buildCreatePayload(draft));
    const hub = await assignKohCourts(created.id, buildAssignPayload(draft));
    handlers.onStarted(hub);
  } catch (error) {
    if (isEmailVerifyRequired(error)) {
      handlers.markEmailVerifyRequired(error.verifyBy);
      return;
    }
    handlers.setErrorText((error as Error).message);
  }
}
