/** Builds payloads in the shape of PadelMix's public tournament endpoint. */

type Pairing = [number, number, number, number];

export interface FixtureOptions {
  players?: number;
  courts?: number;
  pointsPerRound?: number | null;
  tournamentType?: string;
  tournamentVariant?: string;
  /** One entry per round; each pairing is [a1, a2, b1, b2] as player indexes. */
  rounds?: Pairing[][];
  /** Scores keyed by `${roundIndex}:${matchIndex}`. */
  scores?: Record<string, [number, number]>;
  stage?: string;
}

const DEFAULT_ROUNDS: Pairing[][] = [
  [
    [0, 1, 2, 3],
    [4, 5, 6, 7]
  ],
  [
    [0, 2, 4, 6],
    [1, 3, 5, 7]
  ],
  [
    [0, 4, 1, 5],
    [2, 6, 3, 7]
  ]
];

export const sourcePlayerId = (index: number): string => `pm-player-${index}`;

export function padelMixFixture(options: FixtureOptions = {}): unknown {
  const playerCount = options.players ?? 8;
  const courts = options.courts ?? 2;
  const ref = (index: number): { id: string; name: string } => ({
    id: sourcePlayerId(index),
    name: `Player ${index + 1}`
  });
  const rounds = (options.rounds ?? DEFAULT_ROUNDS).map((pairings, roundIndex) => ({
    id: `pm-round-${roundIndex}`,
    stage: options.stage ?? "regular",
    state: "pending",
    roundNumber: roundIndex + 1,
    matches: pairings.map(([a1, a2, b1, b2], matchIndex) => {
      const score = options.scores?.[`${roundIndex}:${matchIndex}`] ?? [0, 0];
      return {
        id: `pm-match-${roundIndex}-${matchIndex}`,
        teamA: { player1: ref(a1), player2: ref(a2) },
        teamB: { player1: ref(b1), player2: ref(b2) },
        // PadelMix lists courts in order, but matches are not guaranteed to follow it.
        courtName: `Court ${courts - matchIndex}`,
        teamAScore: score[0],
        teamBScore: score[1],
        bracketRound: null
      };
    })
  }));
  return {
    currentDataVersion: 1,
    tournamentData: {
      state: "pending",
      rounds,
      information: {
        tournamentName: "Sunday Americano",
        tournamentType: options.tournamentType ?? "americano",
        tournamentVariant: options.tournamentVariant ?? "classic-americano",
        participantType: "individual",
        numberOfCourts: courts,
        pointsPerRound: options.pointsPerRound === undefined ? 16 : options.pointsPerRound,
        courts: Array.from({ length: courts }, (_, index) => ({ name: `Court ${index + 1}` })),
        tournamentParticipants: Array.from({ length: playerCount }, (_, index) => ({
          ...ref(index),
          gender: index % 2 === 0 ? "male" : "female",
          joinedAtRound: 1
        }))
      }
    },
    status: "active"
  };
}
