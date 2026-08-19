import type { FastifyInstance, FastifyReply } from "fastify";
import {
  exportContentType,
  exportFileName,
  toCsv,
  type ExportScope,
  type ExportTable
} from "@padel/shared";
import type { Readable } from "node:stream";

import { requireOrganizerAccess } from "../../../lib/auth.js";
import { notFound } from "../../../shared/kernel/appError.js";
import { mapAppError } from "../../../shared/http/mapAppError.js";
import { buildTournamentExportTable } from "../application/exportTournament.js";
import { renderExportTablePdf } from "../../../shared/export/PdfExportRenderer.js";
import { requireOrganizerTournament } from "../application/loadTournament.js";
import type { TournamentModuleDeps } from "../application/ports.js";
import {
  EXPORT_RATE_LIMIT,
  parseExportFormat,
  parseScope,
  type SupportedExportFormat
} from "./exportSupport.js";

function sendTable(
  reply: FastifyReply,
  table: ExportTable,
  name: string,
  isoDate: string,
  format: SupportedExportFormat,
  scope: ExportScope
): string | Readable {
  // The filename says which shape it is, so a downloads folder stays readable.
  const fileName = exportFileName(scope === "full" ? "full" : "leaderboard", name, isoDate, format);
  reply.header("content-type", exportContentType(format));
  reply.header("content-disposition", `attachment; filename="${fileName}"`);
  return format === "pdf" ? renderExportTablePdf(table) : toCsv(table);
}

/** Leaderboard download for the organizer and for spectators holding the share token. */
export function registerTournamentExportRoutes(
  server: FastifyInstance,
  deps: TournamentModuleDeps
): void {
  server.get(
    "/tournaments/:id/export",
    { preHandler: requireOrganizerAccess, config: EXPORT_RATE_LIMIT },
    async (request, reply) => {
      const params = request.params as { id: string };
      try {
        const query = request.query as { format?: string; scope?: string };
        const format = parseExportFormat(query.format);
        const scope = parseScope(query.scope);
        if (!request.user) {
          throw notFound("Tournament not found.");
        }
        const tournament = await requireOrganizerTournament(deps.repo, params.id, request.user.id);
        return sendTable(
          reply,
          buildTournamentExportTable(tournament, scope),
          tournament.config.name,
          tournament.updatedAt,
          format,
          scope
        );
      } catch (error) {
        return mapAppError(reply, error);
      }
    }
  );

  server.get(
    "/public/:token/export",
    { config: EXPORT_RATE_LIMIT },
    async (request, reply) => {
      const params = request.params as { token: string };
      try {
        const query = request.query as { format?: string; scope?: string };
        const format = parseExportFormat(query.format);
        const scope = parseScope(query.scope);
        const tournament = await deps.repo.getByPublicToken(params.token);
        if (!tournament) {
          throw notFound("Tournament not found.");
        }
        return sendTable(
          reply,
          buildTournamentExportTable(tournament, scope),
          tournament.config.name,
          tournament.updatedAt,
          format,
          scope
        );
      } catch (error) {
        return mapAppError(reply, error);
      }
    }
  );
}
