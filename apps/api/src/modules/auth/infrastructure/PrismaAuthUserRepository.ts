import { recordUsageEvent, recordConversion } from "../../usage/infrastructure/recordEvent.js";
import { prisma } from "../../../lib/prisma.js";
import type { AuthUserPatch, AuthUserRecord, AuthUserRepository, NewAuthUser } from "../application/ports.js";
import { toAuthUserRecord } from "./authUserMapper.js";

export class PrismaAuthUserRepository implements AuthUserRepository {
  async findById(id: string): Promise<AuthUserRecord | null> {
    const row = await prisma.user.findUnique({ where: { id } });
    return row ? toAuthUserRecord(row) : null;
  }

  async findByEmail(email: string): Promise<AuthUserRecord | null> {
    const row = await prisma.user.findUnique({ where: { email } });
    return row ? toAuthUserRecord(row) : null;
  }

  async findByGoogleId(googleId: string): Promise<AuthUserRecord | null> {
    const row = await prisma.user.findUnique({ where: { googleId } });
    return row ? toAuthUserRecord(row) : null;
  }

  async findByGuestId(guestId: string): Promise<AuthUserRecord | null> {
    const row = await prisma.user.findUnique({ where: { guestId } });
    return row ? toAuthUserRecord(row) : null;
  }

  async create(input: NewAuthUser): Promise<AuthUserRecord> {
    const row = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({ data: input });
      await recordUsageEvent(tx, {
        id: `account:${user.id}`,
        kind: "account.created",
        surface: "organizer",
        actorUserId: user.id,
        targetId: user.id
      });
      return user;
    });
    return toAuthUserRecord(row);
  }

  async update(id: string, patch: AuthUserPatch): Promise<AuthUserRecord> {
    const row = await prisma.$transaction(async (tx) => {
      const before = await tx.user.findUniqueOrThrow({ where: { id }, select: { isGuest: true } });
      const user = await tx.user.update({ where: { id }, data: patch });
      await recordConversion(tx, before, user);
      return user;
    });
    return toAuthUserRecord(row);
  }

  async hasPasswordCredential(userId: string): Promise<boolean> {
    const row = await prisma.opaqueRecord.findUnique({
      where: { userId },
      select: { id: true }
    });
    return row !== null;
  }

  async getPasswordEnvelope(userId: string): Promise<string | null> {
    const row = await prisma.opaqueRecord.findUnique({
      where: { userId },
      select: { envelope: true }
    });
    return row?.envelope ?? null;
  }

  async addPasswordCredential(userId: string, envelope: string): Promise<void> {
    await prisma.opaqueRecord.create({ data: { userId, envelope } });
  }

  async replacePasswordCredential(
    userId: string,
    envelope: string,
    verifiedAt: Date
  ): Promise<AuthUserRecord> {
    const row = await prisma.$transaction(async (tx) => {
      await tx.opaqueRecord.deleteMany({ where: { userId } });
      await tx.opaqueRecord.create({ data: { userId, envelope } });
      const before = await tx.user.findUniqueOrThrow({ where: { id: userId }, select: { isGuest: true } });
      const user = await tx.user.update({
        where: { id: userId },
        data: { emailVerifiedAt: verifiedAt, isGuest: false }
      });
      await recordConversion(tx, before, user);
      return user;
    });
    return toAuthUserRecord(row);
  }
}
