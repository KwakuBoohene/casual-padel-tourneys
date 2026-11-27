/**
 * Tournament drafts: saved create-wizard input that hasn't started yet.
 * Writes run inside organizer mutation work (transaction + organizer lock + activity);
 * access is resolved by `resolveOrganizerRequest` (draft id → owning organizer).
 */
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";

import { requireOrganizerAccess } from "../../../lib/auth.js";
import { mapAppError } from "../../../shared/http/mapAppError.js";
import { forbidden } from "../../../shared/kernel/appError.js";
import { organizerId } from "../../organizerAccess/infrastructure/access.js";
import {
  createDraft,
  deleteDraft,
  getDraft,
  listDrafts,
  updateDraft,
  type DraftActor
} from "../application/draftUseCases.js";
import { startDraft } from "../application/startDraft.js";
import { draftRepository } from "../infrastructure/PrismaDraftRepository.js";
import { createDraftTournamentStarter } from "./tournamentStarter.js";

const CREATE_RATE_LIMIT = { rateLimit: { max: 30, timeWindow: "5 minutes" } } as const;

function actorOf(request: FastifyRequest): DraftActor {
  if (!request.user) throw forbidden("Authentication required.");
  return {
    organizerId: organizerId(request),
    actorUserId: request.user.id,
    role: request.organizerContext?.role ?? "OWNER"
  };
}

async function respond<T>(reply: FastifyReply, work: () => Promise<T>, status = 200) {
  try {
    const result = await work();
    reply.status(status);
    return result;
  } catch (error) {
    return mapAppError(reply, error);
  }
}

const idOf = (request: FastifyRequest) => (request.params as { id: string }).id;

export function registerTournamentDraftModule(server: FastifyInstance): void {
  const repo = draftRepository;
  const starter = createDraftTournamentStarter(server);
  const guard = { preHandler: requireOrganizerAccess };

  server.get("/drafts", guard, (request, reply) =>
    respond(reply, async () => ({ data: await listDrafts(repo, actorOf(request)) }))
  );

  server.post("/drafts", { ...guard, config: CREATE_RATE_LIMIT }, (request, reply) =>
    respond(reply, async () => ({ data: await createDraft(repo, actorOf(request), request.body) }), 201)
  );

  server.get("/drafts/:id", guard, (request, reply) =>
    respond(reply, async () => ({ data: await getDraft(repo, actorOf(request), idOf(request)) }))
  );

  server.patch("/drafts/:id", guard, (request, reply) =>
    respond(reply, async () => ({
      data: await updateDraft(repo, actorOf(request), idOf(request), request.body)
    }))
  );

  /** Same `{ data }` shape as `POST /tournaments`, plus `alreadyStarted` for idempotent retries. */
  server.post("/drafts/:id/start", guard, (request, reply) =>
    respond(reply, async () => {
      const result = await startDraft({ repo, starter }, actorOf(request), idOf(request), request.body);
      return { data: result.tournament, alreadyStarted: result.alreadyStarted };
    })
  );

  server.delete("/drafts/:id", guard, (request, reply) =>
    respond(reply, async () => {
      await deleteDraft(repo, actorOf(request), idOf(request));
      return { ok: true };
    })
  );
}
