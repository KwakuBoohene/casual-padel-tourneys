import assert from "node:assert/strict";
import test from "node:test";
import { mkdtemp, writeFile, readFile, readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { prepareSourceMaps } from "./sentry-sourcemaps.mjs";

async function fixture(t) {
  const directory = await mkdtemp(join(tmpdir(), "cpa-sourcemaps-"));
  t.after(() => rm(directory, { recursive: true, force: true }));
  await writeFile(join(directory, "app.js"), 'throw new Error("test");\n//# sourceMappingURL=app.js.map\n');
  await writeFile(
    join(directory, "app.js.map"),
    JSON.stringify({ version: 3, sources: ["app.ts"], mappings: "AAAA", sourcesContent: ["private source"] })
  );
  return directory;
}

async function assertPrivate(directory) {
  assert.ok(!(await readdir(directory)).some((file) => file.endsWith(".map")));
  assert.ok(!(await readFile(join(directory, "app.js"), "utf8")).includes("sourceMappingURL"));
}

async function inject(directory) {
  const file = join(directory, "app.js.map");
  const payload = JSON.parse(await readFile(file, "utf8"));
  await writeFile(file, JSON.stringify({ ...payload, debug_id: "01234567-1234-1234-1234-0123456789ab" }));
}

test("no credentials performs offline injection only and never leaves maps to serve", async (t) => {
  const directory = await fixture(t);
  let calls = 0;
  await prepareSourceMaps(directory, {
    env: {},
    run: async (args) => {
      assert.equal(args[1], "inject");
      calls++;
      await inject(directory);
    }
  });
  assert.equal(calls, 1);
  await assertPrivate(directory);
});

test("upload uses debug IDs, omits release/dist and removes maps only after upload", async (t) => {
  const directory = await fixture(t);
  let uploaded = false;
  await prepareSourceMaps(directory, {
    env: {
      SENTRY_AUTH_TOKEN: "private-token",
      SENTRY_ORG: "org",
      SENTRY_PROJECT: "project",
      SENTRY_RELEASE: "not-used",
      SENTRY_DIST: "not-used"
    },
    run: async (args, env) => {
      assert.equal(env.SENTRY_RELEASE, undefined);
      assert.equal(env.SENTRY_DIST, undefined);
      assert.ok(!args.includes("private-token"));
      if (args[1] === "inject") await inject(directory);
      else {
        assert.equal(args[1], "upload");
        assert.ok((await readFile(join(directory, "app.js.map"), "utf8")).includes("private source"));
        uploaded = true;
      }
    }
  });
  assert.ok(uploaded);
  await assertPrivate(directory);
});

test("partial credentials fail closed and remove maps", async (t) => {
  const directory = await fixture(t);
  await assert.rejects(
    prepareSourceMaps(directory, { env: { SENTRY_ORG: "org" }, run: () => assert.fail("must not run") }),
    /together/
  );
  await assertPrivate(directory);
});

test("upload failure fails the build while keeping private sources out of output", async (t) => {
  const directory = await fixture(t);
  await assert.rejects(
    prepareSourceMaps(directory, {
      env: { SENTRY_AUTH_TOKEN: "token", SENTRY_ORG: "org", SENTRY_PROJECT: "project" },
      run: async (args) => {
        if (args[1] === "inject") await inject(directory);
        else throw new Error("upload unavailable");
      }
    }),
    /upload unavailable/
  );
  await assertPrivate(directory);
});
