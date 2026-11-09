import { readdir, readFile, writeFile, rm } from "node:fs/promises";
import { existsSync, readFileSync } from "node:fs";
import { resolve, join } from "node:path";
import { createRequire } from "node:module";
import { spawnSync } from "node:child_process";
import { pathToFileURL } from "node:url";

async function filesIn(directory) {
  const files = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) files.push(...(await filesIn(path)));
    else if (entry.isFile()) files.push(path);
  }
  return files;
}

function runCli(args, env) {
  const require = createRequire(resolve(process.cwd(), "package.json"));
  const cli = require.resolve("@sentry/cli/bin/sentry-cli");
  const result = spawnSync(process.execPath, [cli, ...args], { env, stdio: "inherit" });
  if (result.error || result.status !== 0)
    throw new Error("Sentry source-map processing failed; build aborted.");
}

/** Process the exact bundles that will be served, then remove private maps even on failure. */
export async function prepareSourceMaps(directory, { env = process.env, run = runCli } = {}) {
  const files = await filesIn(directory);
  const maps = files.filter((file) => file.endsWith(".map"));
  const javascript = files.filter((file) => /\.[cm]?js$/.test(file));
  try {
    if (!maps.length || !javascript.length)
      throw new Error("Build did not produce JavaScript and source maps.");
    const secretPath = "/run/secrets/sentry_auth_token";
    const token =
      env.SENTRY_AUTH_TOKEN || (existsSync(secretPath) ? readFileSync(secretPath, "utf8").trim() : "");
    const configured = Boolean(token || env.SENTRY_ORG || env.SENTRY_PROJECT);
    if (configured && !(token && env.SENTRY_ORG && env.SENTRY_PROJECT)) {
      throw new Error("Source-map upload needs SENTRY_AUTH_TOKEN, SENTRY_ORG and SENTRY_PROJECT together.");
    }
    const cliEnv = { ...env, SENTRY_AUTH_TOKEN: token };
    // Debug IDs match bundles to maps without named releases, even if a host exports these variables.
    delete cliEnv.SENTRY_RELEASE;
    delete cliEnv.SENTRY_DIST;
    await run(["sourcemaps", "inject", directory], cliEnv);
    for (const map of maps) {
      const payload = JSON.parse(await readFile(map, "utf8"));
      if (!(payload.debug_id || payload.debugId))
        throw new Error("Source map is missing its injected debug ID.");
    }
    if (configured) {
      await run(["sourcemaps", "upload", "--validate", "--wait", directory], cliEnv);
      console.log("Private Sentry source-map upload completed (debug IDs; no release tagging).");
    } else {
      console.log("Sentry upload skipped: no upload settings. Debug IDs injected; private maps removed.");
    }
  } finally {
    for (const file of javascript) {
      const source = await readFile(file, "utf8");
      await writeFile(file, source.replace(/^\/\/[#@] sourceMappingURL=.*(?:\r?\n|$)/gm, ""));
    }
    for (const map of maps) await rm(map);
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  await prepareSourceMaps(resolve(process.cwd(), "dist"));
}
