import test from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { ESLint } from "eslint";

/**
 * Guards the hexagonal layering encoded in `eslint.config.js`: if these probes stop failing,
 * domain/application code can import Fastify or Prisma again without CI noticing.
 */
const apiRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const eslint = new ESLint({ cwd: apiRoot });

async function boundaryErrors(relativePath: string, code: string): Promise<string[]> {
  const [result] = await eslint.lintText(code, { filePath: path.join(apiRoot, relativePath) });
  return result.messages
    .filter((message) => message.ruleId === "boundaries/dependencies")
    .map((message) => message.message);
}

test("domain code cannot import Fastify, Prisma or Redis", async () => {
  const errors = await boundaryErrors(
    "src/modules/koh/domain/__boundaryProbe.ts",
    [
      'import type { FastifyInstance } from "fastify";',
      'import type { PrismaClient } from "@prisma/client";',
      'import { Redis } from "ioredis";',
      "export type Probe = FastifyInstance | PrismaClient | Redis;"
    ].join("\n")
  );

  assert.equal(errors.length, 3, errors.join("\n"));
  for (const banned of ["fastify", "@prisma/client", "ioredis"]) {
    assert.ok(
      errors.some((message) => message.includes(banned)),
      `expected a boundary error for ${banned}, got: ${errors.join(" | ")}`
    );
  }
});

test("application code cannot import Fastify or Prisma", async () => {
  const errors = await boundaryErrors(
    "src/modules/koh/application/__boundaryProbe.ts",
    [
      'import type { FastifyInstance } from "fastify";',
      'import type { PrismaClient } from "@prisma/client";',
      "export type Probe = FastifyInstance | PrismaClient;"
    ].join("\n")
  );

  assert.equal(errors.length, 2, errors.join("\n"));
});

test("infrastructure code may still import Prisma", async () => {
  const errors = await boundaryErrors(
    "src/modules/koh/infrastructure/__boundaryProbe.ts",
    ['import type { PrismaClient } from "@prisma/client";', "export type Probe = PrismaClient;"].join(
      "\n"
    )
  );

  assert.deepEqual(errors, []);
});
