export interface HistoricalCoverage {
  importedEvents: number;
  setsComplete: boolean;
  gamesComplete: boolean;
  pointsComplete: boolean;
}
export interface HistoricalMetadata {
  eventKey: string;
  title: string;
  eventDate: string;
  mode: "AMERICANO" | "MEXICANO" | "KING_OF_THE_COURT" | "";
  variant: "CLASSIC" | "TEAM" | "MIXED" | "";
  scoringMode: "REGULAR" | "AMERICANO_POINTS";
}
export interface HistoricalSourceRow {
  rowNumber: number;
  rank: number;
  name: string;
  matchesPlayed: number;
  matchesWon: number;
  matchesLost: number;
  matchesDrawn: number;
  gamesWon: number | null;
  gamesLost: number | null;
  setsWon: number | null;
  setsLost: number | null;
  americanoPointsWon: number | null;
  americanoPointsLost: number | null;
  sourcePoints: number | null;
  sourceFile: string;
  notes: string;
}
export interface HistoricalMapping {
  rowNumber: number;
  playerId: string | null;
  newName: string;
  reviewed: boolean;
}
export interface HistoricalPreview {
  metadata: HistoricalMetadata;
  rows: HistoricalSourceRow[];
  mappings: HistoricalMapping[];
  players: Array<{ id: string; name: string }>;
  changes: Array<{
    name: string;
    beforeWins: number;
    afterWins: number;
    beforePlayed: number;
    afterPlayed: number;
  }>;
  warnings: string[];
  previewToken: string | null;
}
export interface HistoricalImportSummary {
  id: string;
  title: string;
  eventDate: string;
  mode: string;
  variant: string;
  scoringMode: string;
  eventKey: string;
  included: boolean;
  version: number;
  createdByName: string;
  playerCount: number;
}
export interface HistoricalImportDetail extends HistoricalImportSummary {
  rows: Array<HistoricalSourceRow & { playerId: string; playerName: string }>;
  revisions: Array<{ number: number; createdAt: string; actorName: string; reason: string }>;
}

export const HISTORICAL_NOTICE =
  "Imported historical totals are included. Individual match scores and opponents are unavailable for imported results. Missing set totals are unavailable; incomplete tie-break metrics are skipped within tied groups.";

export const HISTORICAL_CSV_TEMPLATE =
  "schema_version,event_key,tournament_name,event_date,tournament_mode,variant,scoring_mode,source_rank,player_name,matches_played,matches_won,matches_lost,matches_drawn,games_won,games_lost,sets_won,sets_lost,americano_points_won,americano_points_lost\r\n1,my-event,My historical event,2026-08-18,AMERICANO,TEAM,REGULAR,1,Player A,1,1,0,0,3,1,,,,\r\n1,my-event,My historical event,2026-08-18,AMERICANO,TEAM,REGULAR,2,Player B,1,1,0,0,3,1,,,,\r\n1,my-event,My historical event,2026-08-18,AMERICANO,TEAM,REGULAR,3,Player C,1,0,1,0,1,3,,,,\r\n1,my-event,My historical event,2026-08-18,AMERICANO,TEAM,REGULAR,4,Player D,1,0,1,0,1,3,,,,\r\n";
