import { organizerId } from "../../organizerAccess/infrastructure/access.js";
import type { FastifyInstance, FastifyReply } from "fastify";
import { exportContentType, exportFileName, toCsv, type TournamentExportScope } from "@padel/shared";
import type { Readable } from "node:stream";

import { requireOrganizerAccess } from "../../../lib/auth.js";
import { notFound } from "../../../shared/kernel/appError.js";
import { mapAppError } from "../../../shared/http/mapAppError.js";
import { buildTournamentExportTable, buildTournamentSchedule } from "../application/exportTournament.js";
import { renderMatchSchedulePdf } from "../../../shared/export/MatchSchedulePdfRenderer.js";
import { renderExportTablePdf } from "../../../shared/export/PdfExportRenderer.js";
import { requireOrganizerTournament } from "../application/loadTournament.js";
import type { TournamentModuleDeps } from "../application/ports.js";
import type { TournamentState } from "../../../types/state.js";
import {
  EXPORT_RATE_LIMIT,
  parseExportFormat,
  parseTournamentScope,
  type SupportedExportFormat
} from "./exportSupport.js";

function sendExport(
  reply: FastifyReply,
  tournament: TournamentState,
  format: SupportedExportFormat,
  scope: TournamentExportScope
): string | Readable {
  // The filename says which shape it is, so a downloads folder stays readable.
  const kind = scope === "leaderboard" ? "leaderboard" : scope;
  const fileName = exportFileName(kind, tournament.config.name, tournament.updatedAt, format);
  reply.header("content-type", exportContentType(format));
  reply.header("content-disposition", `attachment; filename="${fileName}"`);
  if (format === "pdf" && scope === "schedule") {
    return renderMatchSchedulePdf(buildTournamentSchedule(tournament));
  }
  const table = buildTournamentExportTable(tournament, scope);
  return format === "pdf" ? renderExportTablePdf(table) : toCsv(table);
}

/** Leaderboard download for the organizer and for spectators holding the share token. */
export function registerTournamentExportRoutes(server: FastifyInstance, deps: TournamentModuleDeps): void {
  server.get(
    "/tournaments/:id/export",
    { preHandler: requireOrganizerAccess, config: EXPORT_RATE_LIMIT },
    async (request, reply) => {
      const params = request.params as { id: string };
      try {
        const query = request.query as { format?: string; scope?: string };
        const format = parseExportFormat(query.format);
        const scope = parseTournamentScope(query.scope);
        if (!request.user) {
          throw notFound("Tournament not found.");
        }
        const tournament = await requireOrganizerTournament(deps.repo, params.id, organizerId(request));
        return sendExport(reply, tournament, format, scope);
      } catch (error) {
        return mapAppError(reply, error);
      }
    }
  );

  server.get("/public/:token/export", { config: EXPORT_RATE_LIMIT }, async (request, reply) => {
    const params = request.params as { token: string };
    try {
      const query = request.query as { format?: string; scope?: string };
      const format = parseExportFormat(query.format);
      const scope = parseTournamentScope(query.scope);
      const tournament = await deps.repo.getByPublicToken(params.token);
      if (!tournament) {
        throw notFound("Tournament not found.");
      }
      return sendExport(reply, tournament, format, scope);
    } catch (error) {
      return mapAppError(reply, error);
    }
  });
}
