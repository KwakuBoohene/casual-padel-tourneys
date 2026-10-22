import { PrismaClient, type Prisma } from "@prisma/client";
import { databaseWork } from "./databaseContext.js";

export const databaseClient = new PrismaClient();
/** Resolve the current transaction at query creation, isolated by AsyncLocalStorage per request. */
export const prisma = new Proxy(databaseClient, {
  get(target, property) {
    const work = databaseWork.getStore();
    if (work && property === "$transaction") {
      return (operation: ((tx: Prisma.TransactionClient) => unknown) | Promise<unknown>[]) =>
        typeof operation === "function" ? operation(work.transaction) : Promise.all(operation);
    }
    const client = work?.transaction ?? target;
    const value = Reflect.get(client, property);
    return typeof value === "function" ? value.bind(client) : value;
  }
});
