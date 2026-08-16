/**
 * Auth HTTP module entry. Other modules reach auth only through the preHandlers
 * re-exported from `lib/auth.ts`, never through these route files.
 */
import type { FastifyInstance } from "fastify";

import { registerAttachPasswordRoutes } from "./attachPasswordRoutes.js";
import { registerAttachIdentityRoutes } from "./attachRoutes.js";
import { createAuthDeps } from "./deps.js";
import { registerMagicLinkRoutes } from "./magicLinkRoutes.js";
import { registerAuthMeRoutes } from "./meRoutes.js";
import { registerPasswordResetRoutes } from "./passwordResetRoutes.js";
import { registerPasswordAuthRoutes } from "./passwordRoutes.js";
import { registerAuthSessionRoutes } from "./sessionRoutes.js";

export async function registerAuthModule(server: FastifyInstance): Promise<void> {
  const deps = createAuthDeps();
  registerAuthSessionRoutes(server, deps);
  registerAuthMeRoutes(server, deps);
  registerMagicLinkRoutes(server, deps);
  registerPasswordAuthRoutes(server, deps);
  registerPasswordResetRoutes(server, deps);
  registerAttachIdentityRoutes(server, deps);
  registerAttachPasswordRoutes(server, deps);
}
