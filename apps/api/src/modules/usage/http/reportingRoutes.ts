import type { FastifyInstance } from "fastify";
import { adminOverviewQuerySchema, usageActivityQuerySchema } from "@padel/shared";
import { validation } from "../../../shared/kernel/appError.js";
import { reportUsage } from "../infrastructure/reportUsage.js";
import { reportActivity } from "../infrastructure/reportActivity.js";

export function registerUsageReportingRoutes(admin: FastifyInstance): void {
  admin.get("/admin/usage", async (request) => {
    const query = adminOverviewQuerySchema.safeParse(request.query);
    if (!query.success) throw validation("Invalid usage range.");
    return reportUsage(query.data);
  });
  admin.get("/admin/activity", async (request) => {
    const query = usageActivityQuerySchema.safeParse(request.query);
    if (!query.success) throw validation("Invalid activity filters.");
    return reportActivity(query.data);
  });
}
