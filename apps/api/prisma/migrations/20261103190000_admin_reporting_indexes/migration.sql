CREATE INDEX "User_createdAt_id_idx" ON "User"("createdAt", "id");
CREATE INDEX "Tournament_createdAt_id_idx" ON "Tournament"("createdAt", "id");
CREATE INDEX "Tournament_organizerId_createdAt_id_idx" ON "Tournament"("organizerId", "createdAt", "id");
CREATE INDEX "Round_tournamentId_idx" ON "Round"("tournamentId");
CREATE INDEX "Match_roundId_idx" ON "Match"("roundId");
CREATE INDEX "OrganizerActivity_actorUserId_occurredAt_idx" ON "OrganizerActivity"("actorUserId", "occurredAt");
