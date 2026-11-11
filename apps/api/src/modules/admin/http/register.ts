import { registerUsageReportingRoutes } from "../../usage/http/reportingRoutes.js";
import type { AdminReports } from "../application/reports.js";
import { PrismaAdminReports } from "../infrastructure/PrismaAdminReports.js";
import { registerReportingRoutes } from "./reportingRoutes.js";
import type { SentryHealth } from "../application/sentryHealth.js";
import { createSentryHealth } from "../infrastructure/createSentryHealth.js";
import { registerGa4Routes } from "./ga4Routes.js";
import type { Ga4Reports } from "../application/ga4Reports.js";
import { createGa4Reports } from "../infrastructure/createGa4Reports.js";
import { reportRequestError } from "../../../shared/http/sentryMonitoring.js";
import { adminOverviewQuerySchema, requestMagicLinkSchema } from "@padel/shared";
import { requestAdminSignIn, type AdminSignInServices } from "../application/requestSignIn.js";
import { PrismaAdminSignInServices } from "../infrastructure/PrismaAdminSignInServices.js";
import { AUTH_EMAIL_SEND_RATE_LIMIT } from "../../auth/http/rateLimits.js";
import type { FastifyInstance } from "fastify";
import type { AdminAccessResponse } from "@padel/shared";
import { requireAuth } from "../../../lib/auth.js";
import { validation } from "../../../shared/kernel/appError.js";
import type { AdminAccessStore } from "../application/access.js";
import { PrismaAdminAccessStore } from "../infrastructure/PrismaAdminAccessStore.js";

export function registerAdminModule(
  server: FastifyInstance,
  store: AdminAccessStore = new PrismaAdminAccessStore(),
  services: AdminSignInServices = new PrismaAdminSignInServices(),
  reports: AdminReports = new PrismaAdminReports(),
  ga4Reports: Ga4Reports = createGa4Reports(),
  sentryHealth: SentryHealth = createSentryHealth()
): void {
  server.post(
    "/admin/sign-in",
    {
      config: AUTH_EMAIL_SEND_RATE_LIMIT,
      onRequest: async (_request, reply) => {
        reply.header("Cache-Control", "no-store");
      }
    },
    async (request, reply) => {
      reply.header("Cache-Control", "no-store");
      const parsed = requestMagicLinkSchema.safeParse(request.body);
      if (!parsed.success) return reply.status(400).send({ message: "Enter a valid email address." });
      try {
        await requestAdminSignIn(
          store,
          services,
          parsed.data.email,
          process.env.ADMIN_PORTAL_ENABLED === "true"
        );
      } catch (error) {
        reportRequestError(request, error);
        request.log.error("Admin sign-in link could not be issued.");
      }
      return { message: "If this account has admin access, a sign-in link will arrive shortly." };
    }
  );
  void server.register(async (admin) => {
    admin.addHook("onRequest", async (_request, reply) => {
      reply.header("Cache-Control", "no-store");
    });
    admin.addHook("preHandler", requireAuth);
    admin.addHook("preHandler", async (request, reply) => {
      if (process.env.ADMIN_PORTAL_ENABLED !== "true" || !(await store.isAdmin(request.user!.id))) {
        return reply
          .status(403)
          .send({ code: "ADMIN_ACCESS_DENIED", message: "Admin access is unavailable." });
      }
      // Audit only the route and a bounded opaque resource id, never private query/search text.
      const target = (request.params as { id?: string }).id;
      const targetId = target && /^[A-Za-z0-9_-]{1,128}$/.test(target) ? target : undefined;
      await store.recordRead(request.user!.id, request.routeOptions.url!, request.id, targetId);
    });
    registerReportingRoutes(admin, reports);
    registerUsageReportingRoutes(admin);
    registerGa4Routes(admin, ga4Reports);
    admin.get("/admin/health", async (request) => {
      const query = adminOverviewQuerySchema.safeParse(request.query);
      if (!query.success) throw validation("Invalid health range.");
      return sentryHealth.summary(query.data);
    });
    admin.get(
      "/admin/access",
      async (request): Promise<AdminAccessResponse> => ({
        data: { actorUserId: request.user!.id, access: "ADMIN" }
      })
    );
  });
}
