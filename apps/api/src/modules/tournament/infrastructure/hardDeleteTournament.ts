import { prisma } from "../../../lib/prisma.js";

export async function hardDeleteTournament(
  tournamentId: string,
  stripCareer: boolean
): Promise<void> {
  await prisma.$transaction(async (tx) => {
    if (stripCareer) {
      await tx.organizerPlayerStatDelta.deleteMany({ where: { tournamentId } });
    }
    await tx.tournament.delete({ where: { id: tournamentId } });
  });
}
