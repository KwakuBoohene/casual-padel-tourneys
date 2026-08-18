import { createId } from "@padel/shared";
import type { Match, Player, Round } from "@padel/shared";

import { planRoundCourts, type AmericanoVariant } from "./classicRoundSearch.js";
import { bumpClassicMatchMatrices } from "./pairingMatrices.js";

export interface BuildRoundInput {
  roundNumber: number;
  courts: number;
  variant: AmericanoVariant;
  players: Player[];
  teammateMatrix: Map<string, number>;
  opponentMatrix: Map<string, number>;
  opponentTeamMatrix: Map<string, number>;
  coPlayerMatrix: Map<string, number>;
}

export function buildRound(input: BuildRoundInput): Round {
  const assignments = planRoundCourts({
    players: input.players,
    courts: input.courts,
    variant: input.variant,
    teammateMatrix: input.teammateMatrix,
    opponentMatrix: input.opponentMatrix,
    opponentTeamMatrix: input.opponentTeamMatrix,
    coPlayerMatrix: input.coPlayerMatrix
  });

  const matches: Match[] = assignments.map((assignment, index) => {
    const match: Match = {
      id: createId("match"),
      round: input.roundNumber,
      court: index + 1,
      teamA: assignment.teamA,
      teamB: assignment.teamB,
      completed: false
    };
    bumpClassicMatchMatrices(match, input);
    return match;
  });

  return {
    id: createId("round"),
    roundNumber: input.roundNumber,
    matches,
    isLocked: false
  };
}

export { createClassicPairingMatrices, type ClassicPairingMatrices } from "./pairingMatrices.js";
