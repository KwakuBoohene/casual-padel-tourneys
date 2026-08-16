import { prisma } from "../../../lib/prisma.js";

/** Guests/tests may present a JWT before a User row exists; tournament FK requires it. */
export async function ensureOrganizerUser(input: {
  id: string;
  email?: string;
  name?: string;
  isGuest?: boolean;
}): Promise<void> {
  // Prefer id-scoped email so concurrent test JWTs with shared emails do not collide on @@unique.
  const email = `${input.id}@organizer.local`;
  await prisma.user.upsert({
    where: { id: input.id },
    create: {
      id: input.id,
      email,
      name: input.name ?? "Organizer",
      isGuest: input.isGuest ?? false,
      emailVerifiedAt: new Date()
    },
    update: {
      name: input.name ?? undefined
    }
  });
}

