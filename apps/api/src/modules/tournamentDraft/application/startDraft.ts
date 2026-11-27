import { draftToCreateBodies, getDraftReadiness } from "@padel/shared";

import { AppError, notFound, validation } from "../../../shared/kernel/appError.js";
import { parseStoredPayload } from "../domain/draftView.js";
import type { DraftActor } from "./draftUseCases.js";
import type { DraftRepository, DraftTournamentStarter, StartedTournament } from "./ports.js";

export interface StartDraftResult {
  tournament: StartedTournament;
  alreadyStarted: boolean;
}

const versionConflict = () =>
  new AppError("CONFLICT", 409, "Someone else updated this draft. Review it before starting.", {
    code: "DRAFT_VERSION_CONFLICT"
  });

/**
 * Turn a ready draft into a live tournament via the normal create path.
 * Runs inside the request transaction: an engine failure rolls back the tournament and the draft.
 * Idempotent: a draft that already started returns its tournament.
 */
export async function startDraft(
  deps: { repo: DraftRepository; starter: DraftTournamentStarter },
  actor: DraftActor,
  id: string,
  body: unknown
): Promise<StartDraftResult> {
  const expectedVersion = (body as { expectedVersion?: unknown } | undefined)?.expectedVersion;
  if (!Number.isInteger(expectedVersion) || (expectedVersion as number) < 0) {
    throw validation("expectedVersion is required.");
  }
  const draft = await deps.repo.lockForStart(id);
  if (!draft || draft.organizerId !== actor.organizerId) throw notFound("Draft not found.");

  if (draft.startedTournamentId) {
    const tournament = await deps.starter.load(draft.startedTournamentId, draft.organizerId);
    if (!tournament) throw notFound("The tournament started from this draft no longer exists.");
    return { tournament, alreadyStarted: true };
  }
  if (draft.version !== expectedVersion) throw versionConflict();

  const payload = parseStoredPayload(draft);
  const readiness = getDraftReadiness(payload);
  if (!readiness.ready) {
    throw validation(readiness.blockingReason ?? "This draft isn't ready to start.", {
      code: "DRAFT_NOT_READY",
      readiness
    });
  }

  const tournament = await deps.starter.start(draft.organizerId, draftToCreateBodies(payload));
  if (!(await deps.repo.markStarted(id, expectedVersion as number, tournament.id))) throw versionConflict();
  return { tournament, alreadyStarted: false };
}
