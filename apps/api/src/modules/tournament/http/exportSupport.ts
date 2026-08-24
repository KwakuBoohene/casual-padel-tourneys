import { parseExportScope, type ExportScope } from "@padel/shared";

import { validation } from "../../../shared/kernel/appError.js";

/**
 * Exports are heavier than a normal read and the public one is unauthenticated, so they get a
 * tighter budget than the global 100/min.
 */
export const EXPORT_RATE_LIMIT = {
  rateLimit: { max: 20, timeWindow: "5 minutes" }
} as const;

const SUPPORTED_FORMATS = ["csv", "pdf"] as const;
export type SupportedExportFormat = (typeof SUPPORTED_FORMATS)[number];

export function parseExportFormat(value: string | undefined): SupportedExportFormat {
  const format = (value ?? "csv").toLowerCase();
  if (!SUPPORTED_FORMATS.includes(format as SupportedExportFormat)) {
    throw validation(`Unsupported export format. Supported: ${SUPPORTED_FORMATS.join(", ")}.`);
  }
  return format as SupportedExportFormat;
}

/** `scope` mirrors `format`: unknown values are a 400 naming what is supported. */
export function parseScope(value: string | undefined): ExportScope {
  try {
    return parseExportScope(value);
  } catch (error) {
    throw validation((error as Error).message);
  }
}
