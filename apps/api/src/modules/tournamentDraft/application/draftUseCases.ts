import { tournamentDraftPayloadSchema, type DraftRole, type TournamentDraftPayload } from "@padel/shared";

import { AppError, conflict, notFound, validation } from "../../../shared/kernel/appError.js";
import { toDraftDetail, toDraftSummary, type DraftDetail } from "../domain/draftView.js";
import type { DraftRepository, DraftWrite } from "./ports.js";

export interface DraftActor {
  organizerId: string;
  actorUserId: string;
  role: DraftRole;
}

function parsePayload(input: unknown): TournamentDraftPayload {
  const parsed = tournamentDraftPayloadSchema.safeParse(input);
  if (!parsed.success) {
    throw validation(parsed.error.issues[0]?.message ?? "Invalid draft.", {
      errors: parsed.error.flatten()
    });
  }
  return parsed.data;
}

function toWrite(payload: TournamentDraftPayload): DraftWrite {
  return {
    name: (payload.name ?? "").trim(),
    mode: payload.mode,
    payload
  };
}

function parseExpectedVersion(value: unknown): number {
  if (!Number.isInteger(value) || (value as number) < 0) throw validation("expectedVersion is required.");
  return value as number;
}

const alreadyStarted = () =>
  conflict("This draft has already been started.", { code: "DRAFT_ALREADY_STARTED" });

async function loadOwned(repo: DraftRepository, actor: DraftActor, id: string) {
  const record = await repo.findActive(id);
  if (!record || record.organizerId !== actor.organizerId) throw notFound("Draft not found.");
  return record;
}

export async function createDraft(repo: DraftRepository, actor: DraftActor, body: unknown): Promise<DraftDetail> {
  const payload = parsePayload((body as { payload?: unknown } | undefined)?.payload);
  const record = await repo.create({ ...toWrite(payload), organizerId: actor.organizerId, actorId: actor.actorUserId });
  return toDraftDetail(record, actor.role);
}

export async function listDrafts(repo: DraftRepository, actor: DraftActor) {
  const records = await repo.listOpen(actor.organizerId);
  return records.map((record) => toDraftSummary(record, actor.role));
}

export async function getDraft(repo: DraftRepository, actor: DraftActor, id: string): Promise<DraftDetail> {
  return toDraftDetail(await loadOwned(repo, actor, id), actor.role);
}

export async function updateDraft(
  repo: DraftRepository,
  actor: DraftActor,
  id: string,
  body: unknown
): Promise<DraftDetail> {
  const input = (body ?? {}) as { payload?: unknown; expectedVersion?: unknown };
  const expectedVersion = parseExpectedVersion(input.expectedVersion);
  const payload = parsePayload(input.payload);
  const current = await loadOwned(repo, actor, id);
  if (current.startedTournamentId) throw alreadyStarted();
  const saved = await repo.updateIfVersion(id, expectedVersion, { ...toWrite(payload), actorId: actor.actorUserId });
  if (!saved) {
    const latest = await loadOwned(repo, actor, id);
    if (latest.startedTournamentId) throw alreadyStarted();
    throw new AppError("CONFLICT", 409, "Someone else updated this draft. Review the latest version.", {
      code: "DRAFT_VERSION_CONFLICT",
      latest: toDraftDetail(latest, actor.role)
    });
  }
  return getDraft(repo, actor, id);
}

export async function deleteDraft(repo: DraftRepository, actor: DraftActor, id: string): Promise<void> {
  const current = await loadOwned(repo, actor, id);
  if (current.startedTournamentId) throw alreadyStarted();
  if (!(await repo.softDelete(id))) throw notFound("Draft not found.");
}
