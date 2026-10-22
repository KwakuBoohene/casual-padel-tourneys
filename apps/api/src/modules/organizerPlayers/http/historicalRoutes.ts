import type { FastifyInstance, FastifyRequest } from "fastify";
import { z } from "zod";
import { requireOrganizerAccess } from "../../../lib/auth.js";
import { organizerId, requirePersistedVerifiedUser } from "../../organizerAccess/infrastructure/access.js";
import { validation } from "../../../shared/kernel/appError.js";
import {
  historicalPreviewInput,
  previewHistoricalImport,
  commitHistoricalImport,
  listHistoricalImports,
  getHistoricalImport,
  setHistoricalInclusion
} from "../infrastructure/historicalImports.js";

async function identity(request: FastifyRequest) {
  await requirePersistedVerifiedUser(request.user!.id);
  return { owner: organizerId(request), actor: request.user!.id };
}
export function registerHistoricalImportRoutes(server: FastifyInstance) {
  const prefix = "/organizers/:organizerId/result-imports";
  const options = { preHandler: requireOrganizerAccess, bodyLimit: 4500000 };
  for (const suffix of ["/preview", "/:id/revisions/preview"])
    server.post(prefix + suffix, options, async (request) => {
      const { owner, actor } = await identity(request);
      const input = historicalPreviewInput.safeParse(request.body);
      if (!input.success)
        throw validation("Invalid CSV preview request. Check file size, metadata and player mappings.");
      return {
        data: await previewHistoricalImport(owner, actor, input.data, (request.params as { id?: string }).id)
      };
    });
  for (const suffix of ["", "/:id/revisions"])
    server.post(prefix + suffix, options, async (request) => {
      const { owner, actor } = await identity(request);
      const input = z.object({ previewToken: z.string().min(1).max(4000000) }).safeParse(request.body);
      if (!input.success) throw validation("A confirmed preview is required.");
      return {
        data: await commitHistoricalImport(
          owner,
          actor,
          input.data.previewToken,
          (request.params as { id?: string }).id
        )
      };
    });
  server.get(prefix, { preHandler: requireOrganizerAccess }, async (request) => {
    const { owner } = await identity(request);
    return { data: await listHistoricalImports(owner) };
  });
  server.get(prefix + "/:id", { preHandler: requireOrganizerAccess }, async (request) => {
    const { owner } = await identity(request);
    return { data: await getHistoricalImport(owner, (request.params as { id: string }).id) };
  });
  server.patch(prefix + "/:id/inclusion", options, async (request) => {
    const { owner, actor } = await identity(request);
    const input = z
      .object({ expectedVersion: z.number().int().positive(), included: z.boolean() })
      .safeParse(request.body);
    if (!input.success) throw validation("Include an expectedVersion and inclusion choice.");
    return {
      data: await setHistoricalInclusion(
        owner,
        actor,
        (request.params as { id: string }).id,
        input.data.expectedVersion,
        input.data.included
      )
    };
  });
}
