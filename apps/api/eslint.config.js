import boundaries from "eslint-plugin-boundaries";
import tseslint from "typescript-eslint";

/**
 * Hexagonal layering is enforced here, not by convention: the `boundaries` policies below ban
 * adapter libraries (Fastify, Prisma, Redis) inside the pure layers.
 */
const layerElements = [
  { type: "domain", pattern: "src/modules/*/domain" },
  { type: "application", pattern: "src/modules/*/application" },
  { type: "infrastructure", pattern: "src/modules/*/infrastructure" },
  { type: "http", pattern: "src/modules/*/http" },
  { type: "engine", pattern: "src/engine" },
  { type: "shared-kernel", pattern: "src/shared/kernel" },
  { type: "shared-http", pattern: "src/shared/http" }
];

const bannedInPureLayers = ["fastify", "@fastify/*", "@prisma/client", "ioredis"];

export default tseslint.config(
  {
    ignores: ["dist/**", "node_modules/**", "prisma/**", "src/types/*.d.ts"]
  },
  ...tseslint.configs.recommended,
  {
    files: ["src/**/*.ts", "tests/**/*.ts"],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "module"
    },
    rules: {
      // Base JS rules that the TypeScript compiler does not already reject.
      eqeqeq: ["error", "smart"],
      "no-useless-assignment": "error",
      "no-var": "error",
      "prefer-const": "error",
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_", ignoreRestSiblings: true }
      ]
    }
  },
  {
    files: ["src/**/*.ts"],
    plugins: { boundaries },
    settings: {
      "boundaries/include": ["src/**/*.ts"],
      "boundaries/elements": layerElements
    },
    rules: {
      "boundaries/dependencies": [
        "error",
        {
          default: "allow",
          checkAllOrigins: true,
          policies: [
            {
              from: { element: { types: { anyOf: ["domain", "engine", "shared-kernel"] } } },
              disallow: {
                to: { module: { origin: "external", source: bannedInPureLayers }
                }
              },
              message:
                "{{from.element.type}} is pure: it must not import {{to.module.source}}. Move the adapter concern to infrastructure/ or http/."
            },
            {
              from: { element: { type: "application" } },
              disallow: {
                to: {
                  module: {
                    origin: "external",
                    source: ["fastify", "@fastify/*", "@prisma/client"]
                  }
                }
              },
              message:
                "application depends on ports, not adapters: it must not import {{to.module.source}}. Declare a port and implement it in infrastructure/."
            }
          ]
        }
      ]
    }
  },
  {
    files: ["tests/**/*.ts"],
    rules: {
      // Store/engine harness tests rebind the latest snapshot between steps even when only the
      // in-place mutation matters; the dead-store report is noise there, not a defect.
      "no-useless-assignment": "off",
      "@typescript-eslint/no-non-null-assertion": "off"
    }
  }
);
