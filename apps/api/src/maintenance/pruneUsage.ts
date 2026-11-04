import "dotenv/config";
import { prisma } from "../lib/prisma.js";
import { pruneUsage } from "../modules/usage/infrastructure/pruneUsage.js";
async function main() {
  let count = 0;
  for (let batch = 0; batch < 20; batch++) {
    const removed = await pruneUsage();
    count += removed;
    if (!removed) break;
  }
  console.info(`Pruned ${count} expired usage/audit rows.`);
}
void main()
  .catch(() => {
    console.error("Usage cleanup failed.");
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
