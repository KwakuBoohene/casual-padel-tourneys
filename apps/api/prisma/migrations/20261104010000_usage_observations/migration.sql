CREATE TABLE "UsageEvent" (
 "id" TEXT PRIMARY KEY, "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 "kind" TEXT NOT NULL, "surface" TEXT NOT NULL, "route" TEXT, "sessionId" TEXT,
 "actorUserId" TEXT, "ownerId" TEXT, "targetId" TEXT, "action" TEXT
);
CREATE INDEX "UsageEvent_occurredAt_id_idx" ON "UsageEvent"("occurredAt", "id");
CREATE INDEX "UsageEvent_actorUserId_occurredAt_idx" ON "UsageEvent"("actorUserId", "occurredAt");
CREATE INDEX "UsageEvent_kind_occurredAt_idx" ON "UsageEvent"("kind", "occurredAt");
CREATE TABLE "UsageDay" ("day" DATE NOT NULL, "surface" TEXT NOT NULL, "kind" TEXT NOT NULL, "count" INTEGER NOT NULL DEFAULT 0, PRIMARY KEY ("day", "surface", "kind"));
CREATE TABLE "UsageCoverage" ("source" TEXT PRIMARY KEY, "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP);
