import { conflict } from "../../../../shared/kernel/appError.js";
import type { KohDbTournament } from "../mappers/kohInclude.js";

/**
 * Optimistic-concurrency guard. HTTP turns the attached details into the
 * `{ message, expectedVersion, actualVersion }` 409 body clients already handle.
 */
export function assertKohVersion(row: KohDbTournament, expectedVersion: number): void {
  if (row.version !== expectedVersion) {
    throw conflict(`Version conflict: expected ${expectedVersion}, got ${row.version}.`, {
      expectedVersion,
      actualVersion: row.version
    });
  }
}
