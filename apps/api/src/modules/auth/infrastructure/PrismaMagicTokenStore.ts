import { createMagicToken, hashMagicToken } from "../../../lib/magicTokens.js";
import { prisma } from "../../../lib/prisma.js";
import type {
  AuthUserRecord,
  MagicTokenPurpose,
  MagicTokenStore
} from "../application/ports.js";
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
    row &&
      !row.consumedAt &&
      row.expiresAt.getTime() > Date.now() &&
      allowed.includes(row.purpose)
  );
}

export class PrismaMagicTokenStore implements MagicTokenStore {
  async issue(input: {
    userId: string;
    purpose: MagicTokenPurpose;
    expiresAt: Date;
  }): Promise<string> {
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
    const [user] = await prisma.$transaction([
      prisma.user.update({
        where: { id: record.userId },
        data: { emailVerifiedAt: now, isGuest: false }
      }),
      prisma.magicLinkToken.update({
        where: { id: record.id },
        data: { consumedAt: now }
      })
    ]);
    return toAuthUserRecord(user);
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
