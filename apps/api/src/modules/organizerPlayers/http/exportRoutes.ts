import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import {
  buildLeaderboardExport,
  buildMatchesExport,
  exportContentType,
  exportFileName,
  organizerPlayerRangeSchema,
  toCsv,
  type ExportKind,
  type ExportTable,
  type OrganizerPlayerRange
} from "@padel/shared";
import type { Readable } from "node:stream";

import { requireOrganizerAccess } from "../../../lib/auth.js";
import { renderExportTablePdf } from "../../../shared/export/PdfExportRenderer.js";
import {
  EXPORT_RATE_LIMIT,
  parseExportFormat,
  type SupportedExportFormat
} from "../../tournament/http/exportSupport.js";
import {
  buildCareerLeaderboardExportTable,
  buildCareerMatchesExportTable
} from "../application/exportCareer.js";
import type { OrganizerPlayersDeps } from "../application/ports.js";

const RANGE_ERROR = "range must be month, year, or all.";

function send(
  reply: FastifyReply,
  table: ExportTable,
  kind: ExportKind,
  accountName: string,
  format: SupportedExportFormat,
  now: Date
): string | Readable {
  const fileName = exportFileName(kind, accountName, now.toISOString(), format);
  reply.header("content-type", exportContentType(format));
  reply.header("content-disposition", `attachment; filename="${fileName}"`);
  return format === "pdf" ? renderExportTablePdf(table) : toCsv(table);
}

/** Account-wide exports. Organizer JWT only — a career board spans the whole account. */
export function registerOrganizerPlayerExportRoutes(
  server: FastifyInstance,
  deps: OrganizerPlayersDeps
): void {
  const handler = (kind: ExportKind) =>
    async function exportHandler(request: FastifyRequest, reply: FastifyReply) {
      if (!request.user) {
        reply.status(401);
        return { message: "Unauthorized" };
      }
      const query = request.query as { range?: string; format?: string };
      const range = organizerPlayerRangeSchema.safeParse(query.range ?? "year");
      if (!range.success) {
        reply.status(400);
        return { message: RANGE_ERROR };
      }
      let format: SupportedExportFormat;
      try {
        format = parseExportFormat(query.format);
      } catch {
        reply.status(400);
        return { message: "Unsupported export format. Supported: csv, pdf." };
      }

      const now = new Date();
      const accountName = request.user.name?.trim() || "account";
      // A guest has no cross-event career: hand back the empty shape, not an error.
      const table = request.user.isGuest
        ? emptyTable(kind, range.data, now)
        : kind === "leaderboard"
          ? await buildCareerLeaderboardExportTable(deps, request.user.id, range.data, now)
          : await buildCareerMatchesExportTable(deps, request.user.id, range.data, now);

      request.log.info({ kind, range: range.data, format }, "GET /me/players export");
      return send(reply, table, kind, accountName, format, now);
    };

  server.get(
    "/me/players/leaderboard/export",
    { preHandler: requireOrganizerAccess, config: EXPORT_RATE_LIMIT },
    handler("leaderboard")
  );
  server.get(
    "/me/players/matches/export",
    { preHandler: requireOrganizerAccess, config: EXPORT_RATE_LIMIT },
    handler("matches")
  );
}

/** Guests get the real column set with no rows, so the file opens cleanly in a spreadsheet. */
function emptyTable(kind: ExportKind, range: OrganizerPlayerRange, now: Date): ExportTable {
  const meta = {
    title: kind === "leaderboard" ? "Account leaderboard" : "Account matches",
    subtitle: `${range} · generated ${now.toISOString().slice(0, 10)}`,
    note: "Attach an account to track player careers across events."
  };
  return kind === "leaderboard" ? buildLeaderboardExport([], meta) : buildMatchesExport([], meta);
}
