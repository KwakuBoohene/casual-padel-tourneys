import { recordConversion } from "../../usage/infrastructure/recordEvent.js";
import { createMagicToken, hashMagicToken } from "../../../lib/magicTokens.js";
import { prisma } from "../../../lib/prisma.js";
import type { AuthUserRecord, MagicTokenPurpose, MagicTokenStore } from "../application/ports.js";
import { toAuthUserRecord } from "./authUserMapper.js";

type TokenRow = {
  id: string;
  userId: string;
  purpose: MagicTokenPurpose;
  expiresAt: Date;
  consumedAt: Date | null;
};

function isRedeemable(row: TokenRow | null, allowed: MagicTokenPurpose[]): row is TokenRow {
  return Boolean(
    row && !row.consumedAt && row.expiresAt.getTime() > Date.now() && allowed.includes(row.purpose)
  );
}

export class PrismaMagicTokenStore implements MagicTokenStore {
  async issue(input: { userId: string; purpose: MagicTokenPurpose; expiresAt: Date }): Promise<string> {
    const { rawToken, tokenHash } = createMagicToken();
    await prisma.magicLinkToken.create({
      data: {
        userId: input.userId,
        tokenHash,
        purpose: input.purpose,
        expiresAt: input.expiresAt
      }
    });
    return rawToken;
  }

  async consumeSignIn(rawToken: string): Promise<AuthUserRecord | null> {
    const record = await this.#find(rawToken);
    if (!isRedeemable(record, ["LOGIN", "VERIFY"])) {
      return null;
    }

    const now = new Date();
    return prisma.$transaction(async (tx) => {
      const claimed = await tx.magicLinkToken.updateMany({
        where: { id: record.id, consumedAt: null, expiresAt: { gt: now } },
        data: { consumedAt: now }
      });
      if (claimed.count !== 1) return null;
      const before = await tx.user.findUniqueOrThrow({
        where: { id: record.userId },
        select: { isGuest: true }
      });
      const user = await tx.user.update({
        where: { id: record.userId },
        data: { emailVerifiedAt: now, isGuest: false }
      });
      await recordConversion(tx, before, user);
      return toAuthUserRecord(user);
    });
  }

  async consumeReset(rawToken: string): Promise<{ userId: string } | null> {
    const record = await this.#find(rawToken);
    if (!isRedeemable(record, ["RESET"])) {
      return null;
    }
    await prisma.magicLinkToken.update({
      where: { id: record.id },
      data: { consumedAt: new Date() }
    });
    return { userId: record.userId };
  }

  async #find(rawToken: string): Promise<TokenRow | null> {
    return prisma.magicLinkToken.findUnique({
      where: { tokenHash: hashMagicToken(rawToken) },
      select: { id: true, userId: true, purpose: true, expiresAt: true, consumedAt: true }
    });
  }
}
