import { reportRequestError } from "../../../shared/http/sentryMonitoring.js";
import { requestMagicLinkSchema } from "@padel/shared";
import { requestAdminSignIn, type AdminSignInServices } from "../application/requestSignIn.js";
import { PrismaAdminSignInServices } from "../infrastructure/PrismaAdminSignInServices.js";
import { AUTH_EMAIL_SEND_RATE_LIMIT } from "../../auth/http/rateLimits.js";
import type { FastifyInstance } from "fastify";
import type { AdminAccessResponse } from "@padel/shared";
import { requireAuth } from "../../../lib/auth.js";
import type { AdminAccessStore } from "../application/access.js";
import { PrismaAdminAccessStore } from "../infrastructure/PrismaAdminAccessStore.js";

export function registerAdminModule(
  server: FastifyInstance,
  store: AdminAccessStore = new PrismaAdminAccessStore(),
  services: AdminSignInServices = new PrismaAdminSignInServices()
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
      // Store only a server-owned route template; queries may contain private search text.
      await store.recordRead(request.user!.id, request.routeOptions.url!, request.id);
    });
    admin.get(
      "/admin/access",
      async (request): Promise<AdminAccessResponse> => ({
        data: { actorUserId: request.user!.id, access: "ADMIN" }
      })
    );
  });
}
