import "dotenv/config";
import { createApp } from "./app.js";
import { resolveApiLogLevel } from "./lib/logger.js";

const port = Number(process.env.API_PORT ?? "3001");

const server = await createApp();
server.log.level = resolveApiLogLevel();
await server.listen({ port, host: "0.0.0.0" });
