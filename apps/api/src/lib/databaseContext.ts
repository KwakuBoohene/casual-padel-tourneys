import { AsyncLocalStorage } from "node:async_hooks";
import type { Prisma } from "@prisma/client";

/** A request unit of work. Existing repositories join it rather than opening nested transactions. */
export interface DatabaseWork {
  transaction: Prisma.TransactionClient;
  afterCommit: Array<() => Promise<void>>;
}
export const databaseWork = new AsyncLocalStorage<DatabaseWork>();
export function deferUntilCommit(effect: () => Promise<void>): boolean {
  const work = databaseWork.getStore();
  if (!work) return false;
  work.afterCommit.push(effect);
  return true;
}
