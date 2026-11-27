const names = (count: number, prefix = "Player") =>
  Array.from({ length: count }, (_, index) => ({ name: `${prefix} ${index + 1}` }));

export const FULL_AMERICANO = {
  name: "Friday Night Americano",
  mode: "AMERICANO",
  variant: "CLASSIC",
  schedulingMode: "TARGET_GAMES",
  players: names(12),
  courts: 3,
  pointsPerMatch: 24,
  scoringMode: "AMERICANO_POINTS",
  targetGamesPerPlayer: 4,
  contributeToCareerLeaderboard: true
} as const;

export const FULL_MEXICANO_REGULAR = {
  name: "Club Mexicano",
  mode: "MEXICANO",
  variant: "CLASSIC",
  schedulingMode: "TOTAL_TIME",
  players: names(8),
  courts: 2,
  scoringMode: "REGULAR",
  regularScoring: { setFormat: "BO3_GAMES", setsToWin: 1 },
  tournamentTimeMinutes: 90
} as const;

export const FULL_TEAM_AMERICANO = {
  name: "Team Night",
  mode: "AMERICANO",
  variant: "TEAM",
  schedulingMode: "TARGET_GAMES",
  players: [],
  teams: [
    { playerA: { name: "A1" }, playerB: { name: "A2" } },
    { playerA: { name: "B1" }, playerB: { name: "B2" } }
  ],
  courts: 1,
  pointsPerMatch: 21,
  targetGamesPerPlayer: 3
} as const;

const pair = (a: string, b: string) => ({ playerA: { name: a }, playerB: { name: b } });

export const FULL_KOH = {
  name: "Sunday Social",
  mode: "KING_OF_THE_COURT",
  pairingMode: "WINNER_STAYS",
  courts: 2,
  regularScoring: { setFormat: "BO3_GAMES", setsToWin: 1, deuceMode: "GOLDEN" },
  promotionRules: [{ courtNumber: 2, winsRequired: 4 }],
  contributeToCareerLeaderboard: true,
  courtAssignments: [
    { courtNumber: 1, units: [pair("Alex", "Sam"), pair("Jordan", "Taylor")] },
    { courtNumber: 2, units: [pair("Kwaku", "Ama"), pair("Lee", "Morgan")] }
  ]
} as const;
