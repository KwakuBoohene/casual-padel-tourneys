import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "PUBLIC_API_BASE_URL");
  const config = JSON.stringify({
    apiBaseUrl: process.env.PUBLIC_API_BASE_URL ?? env.PUBLIC_API_BASE_URL ?? ""
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
    server: { port: 3005 },
    preview: { port: 3005 }
  };
});
