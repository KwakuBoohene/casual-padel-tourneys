export type SetupStep =
  | "LIST"
  | "ESTIMATOR"
  | "NAME"
  | "OPTIONS"
  | "PLAYERS"
  | "SETTINGS"
  | "LIVE"
  | "LEADERBOARD"
  | "PLAYER_GAMES"
  | "PROFILE"
  | "ATTACH";

export interface Estimate {
  rounds: number;
  gamesPerPlayer: number;
  durationMinutes: number;
}
