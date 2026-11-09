import "dotenv/config";
import { initSentry } from "./lib/sentry.js";
import { resolveApiLogLevel } from "./lib/logger.js";

initSentry();
const { createApp } = await import("./app.js");

const port = Number(process.env.API_PORT ?? "3001");

const server = await createApp();
server.log.level = resolveApiLogLevel();
await server.listen({ port, host: "0.0.0.0" });
