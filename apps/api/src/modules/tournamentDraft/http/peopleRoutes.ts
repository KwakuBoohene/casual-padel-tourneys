import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { draftInvitationTokenSchema, inviteDraftEditorSchema, updateDraftSettingsSchema } from "@padel/shared";

import { requireAuth, requireOrganizerAccess } from "../../../lib/auth.js";
import { mapAppError } from "../../../shared/http/mapAppError.js";
import { forbidden, notFound, validation } from "../../../shared/kernel/appError.js";
import { sharedOrganizerAccessEnabled } from "../../organizerAccess/domain/policy.js";
import { organizerId } from "../../organizerAccess/infrastructure/access.js";
import type { DraftPeopleActor } from "../infrastructure/draftAccessRows.js";
import {
  resendDraftInvitation,
  revokeDraftInvitation,
  sendDraftInvitation
} from "../infrastructure/draftInvitations.js";
import {
  acceptDraftInvitation,
  declineDraftInvitation,
  previewDraftInvitation
} from "../infrastructure/draftInviteeFlow.js";
import { getDraftPeople, removeDraftEditor, updateDraftSettings } from "../infrastructure/draftPeople.js";

const INVITE_RATE_LIMIT = { rateLimit: { max: 20, timeWindow: "1 minute" } } as const;

function peopleActor(request: FastifyRequest): DraftPeopleActor {
  if (!sharedOrganizerAccessEnabled()) throw notFound("Shared organizer access is not enabled.");
  if (!request.user) throw forbidden("Authentication required.");
  return {
    organizerId: organizerId(request),
    actorUserId: request.user.id,
    actorName: request.user.name ?? "An organizer",
    role: request.organizerContext?.role ?? "OWNER"
  };
}

function parse<T>(schema: { safeParse(input: unknown): { success: true; data: T } | { success: false } }, body: unknown, message: string): T {
  const parsed = schema.safeParse(body);
  if (!parsed.success) throw validation(message);
  return parsed.data;
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

type Params = { id: string; invitationId?: string; userId?: string };
const params = (request: FastifyRequest) => request.params as Params;

export function registerDraftPeopleRoutes(server: FastifyInstance): void {
  const guard = { preHandler: requireOrganizerAccess };

  server.get("/drafts/:id/people", guard, (request, reply) =>
    respond(reply, async () => ({ data: await getDraftPeople(peopleActor(request), params(request).id) }))
  );

  server.post("/drafts/:id/invitations", { ...guard, config: INVITE_RATE_LIMIT }, (request, reply) =>
    respond(
      reply,
      async () => {
        const { email } = parse(inviteDraftEditorSchema, request.body, "Enter a valid email address.");
        return { data: await sendDraftInvitation(peopleActor(request), params(request).id, email) };
      },
      201
    )
  );

  server.post("/drafts/:id/invitations/:invitationId/resend", { ...guard, config: INVITE_RATE_LIMIT }, (request, reply) =>
    respond(reply, async () => ({
      data: await resendDraftInvitation(peopleActor(request), params(request).id, params(request).invitationId!)
    }))
  );

  server.delete("/drafts/:id/invitations/:invitationId", guard, (request, reply) =>
    respond(reply, async () => {
      await revokeDraftInvitation(peopleActor(request), params(request).id, params(request).invitationId!);
      return { ok: true };
    })
  );

  server.delete("/drafts/:id/collaborators/:userId", guard, (request, reply) =>
    respond(reply, async () => {
      await removeDraftEditor(peopleActor(request), params(request).id, params(request).userId!);
      return { ok: true };
    })
  );

  server.patch("/drafts/:id/settings", guard, (request, reply) =>
    respond(reply, async () => {
      const input = parse(updateDraftSettingsSchema, request.body, "Invalid settings.");
      return { data: await updateDraftSettings(peopleActor(request), params(request).id, input) };
    })
  );

  const token = (body: unknown) => parse(draftInvitationTokenSchema, body, "Invalid invitation.").token;
  const tokenLimit = { rateLimit: { max: 30, timeWindow: "1 minute" } } as const;

  server.post("/draft-invitations/preview", { config: tokenLimit }, (request, reply) =>
    respond(reply, async () => ({ data: await previewDraftInvitation(token(request.body)) }))
  );

  server.post("/draft-invitations/accept", { preHandler: requireAuth, config: tokenLimit }, (request, reply) =>
    respond(reply, async () => ({ data: await acceptDraftInvitation(request.user!.id, token(request.body)) }))
  );

  server.post("/draft-invitations/decline", { preHandler: requireAuth, config: tokenLimit }, (request, reply) =>
    respond(reply, async () => ({ data: await declineDraftInvitation(request.user!.id, token(request.body)) }))
  );
}
