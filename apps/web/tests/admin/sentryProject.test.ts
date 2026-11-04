import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { resolveSentryProjectUrl } from "../../lib/admin/sentryProject";
import { SentryLink } from "../../components/admin/SentryLink";

const valid = [
  "https://sentry.example.com/organizations/your-org/projects/your-project/",
  "https://team.sentry.io/issues/?project=123456",
  "https://sentry.io/organizations/team/issues/?project=123456",
  "https://sentry.example.com/settings/team/projects/api/",
  "https://sentry.example.com/projects/api/"
];
const unsafe = [
  "http://team.sentry.io/issues/?project=123456",
  "javascript:alert(1)",
  "//team.sentry.io/issues/?project=123",
  "https://token@team.sentry.io/projects/api/",
  "https://user:PRIVATE_AUTH_TOKEN@team.sentry.io/projects/api/",
  "https://public-key@o123.ingest.sentry.io/123456",
  "https://team.sentry.io/api/0/projects/team/api/",
  "https://team.sentry.io/issues/?project=123&auth_token=PRIVATE_AUTH_TOKEN",
  "https://team.sentry.io/issues/?project=123#PRIVATE_AUTH_TOKEN",
  "https://team.sentry.io/issues/?project=not-a-number",
  "https://team.sentry.io/",
  "https://team.sentry.io/projects/%2Fapi/"
];
test("Sentry navigation accepts only HTTPS public project paths or numeric project issue selectors", () => {
  for (const url of valid) assert.equal(resolveSentryProjectUrl(`  ${url}  `), url);
  for (const value of [...unsafe, "", undefined, null, {}, "x".repeat(2049)])
    assert.equal(resolveSentryProjectUrl(value), null);
});
test("Docker startup and browser navigation share the same URL policy and never serialize auth settings", () => {
  const folder = mkdtempSync(path.join(tmpdir(), "padel-sentry-navigation-"));
  // Redirect only the real script's filesystem paths; exercise its jq policy and JSON serialization.
  const root = path.resolve(import.meta.dirname, "../..");
  const script = readFileSync(path.join(root, "40-viewer-config.sh"), "utf8")
    .replace("/etc/nginx/sentry-project-url-pattern.json", path.join(root, "sentry-project-url-pattern.json"))
    .replace("/usr/share/nginx/html/runtime-config.json", path.join(folder, "runtime-config.json"));
  try {
    for (const value of [...valid, ...unsafe, "", `  ${valid[0]}  `]) {
      execFileSync("sh", ["-c", script], {
        env: {
          PATH: process.env.PATH,
          PUBLIC_API_BASE_URL: "https://api.example.test",
          VIEWER_SENTRY_PROJECT_URL: value,
          SENTRY_AUTH_TOKEN: "PRIVATE_AUTH_TOKEN"
        }
      });
      const json = readFileSync(path.join(folder, "runtime-config.json"), "utf8");
      assert.equal(JSON.parse(json).sentryProjectUrl, resolveSentryProjectUrl(value) ?? "");
      assert.ok(!json.includes("PRIVATE_AUTH_TOKEN"));
      assert.ok(!json.includes("SENTRY_AUTH_TOKEN"));
    }
  } finally {
    rmSync(folder, { recursive: true, force: true });
  }
});
test("the Sentry anchor has no opener, referrer or account parameters and hides missing/invalid config", () => {
  const previous = Object.getOwnPropertyDescriptor(globalThis, "window");
  try {
    for (const url of [valid[0], undefined, unsafe[3]]) {
      Object.defineProperty(globalThis, "window", {
        configurable: true,
        value: { __PADEL_CONFIG__: { sentryProjectUrl: url } }
      });
      const html = renderToStaticMarkup(createElement(SentryLink));
      if (url === valid[0]) {
        assert.ok(html.includes(`href="${url}"`));
        assert.ok(html.includes('target="_blank"'));
        assert.ok(html.includes('rel="noopener noreferrer"'));
        assert.ok(html.includes('referrerPolicy="no-referrer"'));
        assert.ok(html.includes("opens in a new tab"));
      } else assert.equal(html, "");
    }
  } finally {
    if (previous) Object.defineProperty(globalThis, "window", previous);
    else Reflect.deleteProperty(globalThis, "window");
  }
});
