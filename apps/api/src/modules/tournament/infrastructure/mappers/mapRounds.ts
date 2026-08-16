import type { Round as DomainRound } from "@padel/shared";

import type { DbTournamentGraph } from "./tournamentDbTypes.js";

export function mapRoundsFromDb(tournament: DbTournamentGraph): DomainRound[] {
  return tournament.rounds
    .slice()
    .sort((a, b) => a.roundNumber - b.roundNumber)
    .map((round) => ({
      id: round.id,
      roundNumber: round.roundNumber,
      isLocked: round.isLocked,
      matches: round.matches.map((match) => ({
        id: match.id,
        round: round.roundNumber,
        court: match.court,
        teamA: match.teamA as [string, string],
        teamB: match.teamB as [string, string],
        scoreA: match.scoreA ?? undefined,
        scoreB: match.scoreB ?? undefined,
        completed: match.completed,
        matchTbA: match.matchTbA ?? undefined,
        matchTbB: match.matchTbB ?? undefined,
        sets: match.sets
          .slice()
          .sort((a, b) => a.setNumber - b.setNumber)
          .map((set) => ({
            setNumber: set.setNumber,
            gamesA: set.gamesA,
            gamesB: set.gamesB,
            tbA: set.tbA ?? undefined,
            tbB: set.tbB ?? undefined
          }))
      }))
    }));
}
