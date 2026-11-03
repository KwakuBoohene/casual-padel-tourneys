import type { FastifyInstance } from "fastify";
import {
  adminOverviewQuerySchema,
  adminUsersQuerySchema,
  adminTournamentsQuerySchema,
  adminReportIdSchema
} from "@padel/shared";
import { validation } from "../../../shared/kernel/appError.js";
import type { AdminReports } from "../application/reports.js";

export function registerReportingRoutes(admin: FastifyInstance, reports: AdminReports): void {
  function parse<T>(
    schema: { safeParse(value: unknown): { success: true; data: T } | { success: false } },
    value: unknown
  ): T {
    const result = schema.safeParse(value);
    if (!result.success) throw validation("Invalid reporting filters or range.");
    return result.data;
  }
  admin.get("/admin/overview", async (request) =>
    reports.overview(parse(adminOverviewQuerySchema, request.query))
  );
  admin.get("/admin/users", async (request) => reports.users(parse(adminUsersQuerySchema, request.query)));
  admin.get("/admin/tournaments", async (request) =>
    reports.tournaments(parse(adminTournamentsQuerySchema, request.query))
  );
  for (const kind of ["users", "tournaments"] as const) {
    admin.get(`/admin/${kind}/:id`, async (request) => {
      if (Object.keys(request.query as object).length) throw validation("Unexpected detail filters.");
      const id = parse(adminReportIdSchema, (request.params as { id: string }).id);
      return kind === "users" ? reports.user(id) : reports.tournament(id);
    });
  }
}
