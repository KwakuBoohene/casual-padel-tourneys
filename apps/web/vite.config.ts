import { resolveSentryProjectUrl } from "./lib/admin/sentryProject";
import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), ["PUBLIC_API_BASE_URL", "VIEWER_SENTRY_", "VIEWER_GA4_ENABLED"]);
  const config = JSON.stringify({
    ga4Enabled: (process.env.VIEWER_GA4_ENABLED ?? env.VIEWER_GA4_ENABLED) === "true",
    apiBaseUrl: process.env.PUBLIC_API_BASE_URL ?? env.PUBLIC_API_BASE_URL ?? "",
    sentryProjectUrl:
      resolveSentryProjectUrl(process.env.VIEWER_SENTRY_PROJECT_URL ?? env.VIEWER_SENTRY_PROJECT_URL) ?? "",
    sentry: {
      dsn: process.env.VIEWER_SENTRY_DSN ?? env.VIEWER_SENTRY_DSN ?? "",
      environment: process.env.VIEWER_SENTRY_ENVIRONMENT ?? env.VIEWER_SENTRY_ENVIRONMENT ?? mode,
      release: process.env.VIEWER_SENTRY_RELEASE ?? env.VIEWER_SENTRY_RELEASE ?? "",
      tracesSampleRate:
        process.env.VIEWER_SENTRY_TRACES_SAMPLE_RATE ?? env.VIEWER_SENTRY_TRACES_SAMPLE_RATE ?? "0.1"
    }
  });
  return {
    plugins: [
      react(),
      {
        name: "viewer-runtime-config",
        configureServer(server) {
          server.middlewares.use("/runtime-config.json", (_req, res) => {
            res.setHeader("Content-Type", "application/json");
            res.setHeader("Cache-Control", "no-store");
            res.end(config);
          });
        },
        generateBundle() {
          this.emitFile({ type: "asset", fileName: "runtime-config.json", source: config });
        }
      }
    ],
    build: { sourcemap: true },
    server: { port: 3005 },
    preview: { port: 3005 }
  };
});
