/**
 * KOH HTTP module entry. `POST /tournaments` (KOH branch) and the public token
 * reads live in the tournament module and call into `modules/koh` — see
 * `http/createKoh.ts` and `application/readKohHub.ts`.
 */
import type { FastifyInstance } from "fastify";

import { createKohDeps } from "./deps.js";
import { registerKohLifecycleRoutes } from "./lifecycleRoutes.js";
import { registerKohPlayerRoutes } from "./playerRoutes.js";
import { registerKohQueryRoutes } from "./queryRoutes.js";
import { registerKohQueueRoutes } from "./queueRoutes.js";
import { registerKohScoreRoutes } from "./scoreRoutes.js";

export async function registerKohModule(server: FastifyInstance): Promise<void> {
  const deps = createKohDeps(server);
  registerKohQueryRoutes(server, deps);
  registerKohQueueRoutes(server, deps);
  registerKohScoreRoutes(server, deps);
  registerKohPlayerRoutes(server, deps);
  registerKohLifecycleRoutes(server, deps);
}
