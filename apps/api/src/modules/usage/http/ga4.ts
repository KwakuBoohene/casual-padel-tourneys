import { organizerGa4Event, viewerGa4Event } from "@padel/shared";
import type { FastifyInstance } from "fastify";
import { tryAuthUser } from "../../auth/http/preHandlers.js";
import { ga4Config, sendGa4 } from "../infrastructure/ga4.js";

export function registerGa4Collection(server: FastifyInstance): void {
  for (const surface of ["viewer", "organizer"] as const) {
    server.post(`/analytics/ga4/${surface}`, {
      bodyLimit: 1024,
      config: { rateLimit: { max: 60, timeWindow: "1 minute" } }
    }, async (request, reply) => {
      reply.header("Cache-Control", "no-store");
      const config = ga4Config(surface);
      if (!config || request.headers.origin !== config.origin) return reply.code(404).send();
      if (surface === "organizer" && !tryAuthUser(request)) return reply.code(401).send();
      const result = (surface === "viewer" ? viewerGa4Event : organizerGa4Event).safeParse(request.body);
      if (!result.success) return reply.code(400).send();
      try {
        await sendGa4(config, result.data);
        return reply.code(204).send();
      } catch {
        // The transport URL contains a secret. Don't pass the provider error to logs or monitoring.
        request.log.warn("GA4 collection request failed.");
        return reply.code(502).send();
      }
    });
  }
}
