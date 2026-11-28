import { useState } from "react";
import { isKohDraftPayload } from "@padel/shared";

import { getDraft, startDraft, type DraftDetail, type StartDraftResponse } from "../../../api/drafts";
import { isEmailVerifyRequired } from "../../../api/errors";
import { useOrganizerGa4 } from "../../../components/analytics/OrganizerGa4";
import { diffDraftPayload, type DraftChange } from "../../../utilities/organizer/draftDiff";
import { draftStartFailure } from "../../../utilities/organizer/draftStart";

interface Options {
  onStarted: (response: StartDraftResponse, draft: DraftDetail) => void;
  onGone: (message: string) => void;
  onLatest: (latest: DraftDetail) => void;
  markEmailVerifyRequired: (dueAt?: number) => void;
}

interface StartConflict {
  latest: DraftDetail;
  theirs: DraftChange[];
}

/** What a co-organizer changed since this version (the overview has no local edits of its own). */
function theirChanges(base: DraftDetail, latest: DraftDetail): DraftChange[] {
  if (isKohDraftPayload(base.payload) || isKohDraftPayload(latest.payload)) {
    return [{ field: "name", label: "Updated the King of the Court setup" }];
  }
  return diffDraftPayload(base.payload, latest.payload, base.payload).theirs;
}

/** Start confirmation (Figma 08) + `POST /drafts/:id/start`, including 409 / not-ready / gone. */
export function useStartDraft(draft: DraftDetail | null, options: Options) {
  const sendAnalytics = useOrganizerGa4();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [conflict, setConflict] = useState<StartConflict | null>(null);

  const showConflict = async (stale: DraftDetail) => {
    try {
      const latest = await getDraft(stale.id);
      setOpen(false);
      if (latest.startedTournamentId) options.onLatest(latest);
      else setConflict({ latest, theirs: theirChanges(stale, latest) });
    } catch (loadError) {
      setError((loadError as Error).message);
    }
  };

  const submit = async () => {
    if (!draft || busy) return;
    setBusy(true);
    setError(null);
    try {
      const response = await startDraft(draft.id, draft.version);
      setOpen(false);
      sendAnalytics({ event: "draft_action", action: "started" });
      options.onStarted(response, draft);
    } catch (startError) {
      if (isEmailVerifyRequired(startError)) {
        options.markEmailVerifyRequired(startError.verifyBy);
        return;
      }
      const failure = draftStartFailure(startError);
      if (failure.kind === "conflict") await showConflict(draft);
      else if (failure.kind === "gone") options.onGone(failure.message);
      else {
        setError(failure.message);
        // Not ready on the server: show its readiness, not the copy this screen had.
        if (failure.kind === "notReady") void getDraft(draft.id).then(options.onLatest, () => {});
      }
    } finally {
      setBusy(false);
    }
  };

  return {
    sheet: {
      visible: open,
      busy,
      error,
      onConfirm: () => void submit(),
      onCancel: () => !busy && setOpen(false)
    },
    open: () => {
      setError(null);
      setOpen(true);
    },
    conflict: {
      visible: Boolean(conflict),
      editorName: conflict?.latest.updatedBy.name ?? "A co-organizer",
      theirs: conflict?.theirs ?? [],
      mine: [] as DraftChange[],
      onReapply: () => {},
      onDrop: () => {
        if (conflict) options.onLatest(conflict.latest);
        setConflict(null);
      }
    }
  };
}
