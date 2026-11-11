import type { FastifyInstance } from "fastify";
import { adminOverviewQuerySchema } from "@padel/shared";
import { validation } from "../../../shared/kernel/appError.js";
import type { Ga4Reports } from "../application/ga4Reports.js";

/** Read-only GA4 aggregates. Registered inside the admin guard (auth, grant and audit). */
export function registerGa4Routes(admin: FastifyInstance, reports: Ga4Reports): void {
  admin.get("/admin/ga4/viewer", async (request) => {
    const query = adminOverviewQuerySchema.safeParse(request.query);
    if (!query.success) throw validation("Invalid analytics range.");
    return reports.viewer(query.data);
  });
  admin.get("/admin/ga4/organizer", async (request) => {
    const query = adminOverviewQuerySchema.safeParse(request.query);
    if (!query.success) throw validation("Invalid analytics range.");
    return reports.organizer(query.data);
  });
  admin.get("/admin/ga4/viewer/realtime", async (request) => {
    if (Object.keys(request.query as object).length) throw validation("Unexpected realtime filters.");
    return reports.viewerRealtime();
  });
}
