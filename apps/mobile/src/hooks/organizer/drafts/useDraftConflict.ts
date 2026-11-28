import { useMemo } from "react";
import { isKohDraftPayload, type AmericanoMexicanoDraftPayload } from "@padel/shared";

import { useOrganizerGa4 } from "../../../components/analytics/OrganizerGa4";
import { applyDraftSnapshot } from "../../../utilities/organizer/createDraftSnapshot";
import { diffDraftPayload } from "../../../utilities/organizer/draftDiff";
import { fromDraftPayload, toDraftPayload } from "../../../utilities/organizer/draftPayload";
import type { useCreateTournament } from "../useCreateTournament";
import type { useDraftAutosave } from "./useDraftAutosave";

type Create = ReturnType<typeof useCreateTournament>;
type Autosave = ReturnType<typeof useDraftAutosave>;

/** The wizard's view of a payload, so diffs compare like with like. */
const normalize = (payload: AmericanoMexicanoDraftPayload) => toDraftPayload(fromDraftPayload(payload));

/**
 * A co-organizer saved first (409 on autosave). Diff base → theirs vs base → mine, then either
 * re-apply my changes on their latest version or take theirs as is (Figma 07).
 */
export function useDraftConflict(create: Create, autosave: Autosave, local: AmericanoMexicanoDraftPayload) {
  const sendAnalytics = useOrganizerGa4();
  const latest = autosave.conflict;

  const resolved = useMemo(() => {
    if (!latest || !autosave.baselineJson || isKohDraftPayload(latest.payload)) return null;
    const theirs = normalize(latest.payload);
    const base = JSON.parse(autosave.baselineJson) as AmericanoMexicanoDraftPayload;
    return { theirs, diff: diffDraftPayload(base, theirs, local) };
  }, [latest, autosave.baselineJson, local]);

  const resolve = (payload: AmericanoMexicanoDraftPayload, action: "conflict_reapplied" | "conflict_dropped") => {
    if (!latest || !resolved) return;
    applyDraftSnapshot(create, fromDraftPayload(payload), create.wizardStep);
    // Adopt their version as the new base; re-applied changes stay dirty and autosave next.
    autosave.adopt(latest, JSON.stringify(resolved.theirs));
    sendAnalytics({ event: "draft_action", action });
  };

  return {
    visible: autosave.status === "conflict" && Boolean(resolved),
    editorName: latest?.updatedBy.name ?? "A co-organizer",
    theirs: resolved?.diff.theirs ?? [],
    mine: resolved?.diff.mine ?? [],
    onReapply: () => resolved && resolve(resolved.diff.merged, "conflict_reapplied"),
    onDrop: () => resolved && resolve(resolved.theirs, "conflict_dropped")
  };
}

export type DraftConflictSheetState = ReturnType<typeof useDraftConflict>;
