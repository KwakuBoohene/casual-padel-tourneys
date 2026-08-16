import { randomUUID } from "node:crypto";
import jwt from "jsonwebtoken";

import { createApp } from "../../../src/app.js";
import { prisma } from "../../../src/lib/prisma.js";

export const CAREER_JWT_SECRET = "test-secret-key-for-unit-tests";

export function signUser(id: string): string {
  return jwt.sign(
    { sub: id, email: `${id}@example.com`, name: "Test User", emailVerified: true, isGuest: false },
    CAREER_JWT_SECRET,
    { expiresIn: "1h" }
  );
}

async function ensureUser(id: string): Promise<void> {
  await prisma.user.upsert({
    where: { id },
    create: {
      id,
      email: `${id}@example.com`,
      name: "Test User",
      isGuest: false,
      emailVerifiedAt: new Date()
    },
    update: { emailVerifiedAt: new Date(), isGuest: false }
  });
}

/** Career rows accumulate forever, so every run owns a throwaway organizer and drops it. */
async function deleteOrganizer(id: string): Promise<void> {
  await prisma.organizerPlayerStatDelta.deleteMany({ where: { organizerId: id } });
  await prisma.organizerPlayer.deleteMany({ where: { organizerId: id } });
  await prisma.tournament.deleteMany({ where: { organizerId: id } });
  await prisma.user.deleteMany({ where: { id } });
}

export type CareerTestApp = Awaited<ReturnType<typeof createApp>>;

/** Boot the API with a disposable organizer, Redis disabled, and a known JWT secret. */
export async function withApp<T>(
  fn: (app: CareerTestApp, organizerId: string) => Promise<T>
): Promise<T> {
  const organizerId = `career-owner-${randomUUID()}`;
  const originalSecret = process.env.JWT_SECRET;
  const originalRedis = process.env.REDIS_URL;
  process.env.JWT_SECRET = CAREER_JWT_SECRET;
  delete process.env.REDIS_URL;
  const app = await createApp();
  try {
    await ensureUser(organizerId);
    return await fn(app, organizerId);
  } finally {
    await app.close();
    await deleteOrganizer(organizerId);
    if (originalSecret === undefined) delete process.env.JWT_SECRET;
    else process.env.JWT_SECRET = originalSecret;
    if (originalRedis === undefined) delete process.env.REDIS_URL;
    else process.env.REDIS_URL = originalRedis;
  }
}

export async function countDeltas(organizerId: string): Promise<number> {
  return prisma.organizerPlayerStatDelta.count({ where: { organizerId } });
}

export interface LeaderboardRow {
  rank: number;
  id: string;
  name: string;
  gamesWon: number;
  gamesLost: number;
  matchesWon: number;
  matchesLost: number;
  eventsPlayed: number;
}
