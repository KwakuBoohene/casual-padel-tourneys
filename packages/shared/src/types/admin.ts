export interface AdminAccessResponse {
  data: { actorUserId: string; access: "ADMIN" };
}

export interface AdminCoverage {
  source: "retained-records" | "observed-events";
  historyComplete: false;
  unavailable: ("visits" | "activeUsers" | "lastActivity")[];
  limitations: string[];
}
export interface AdminUserSummary {
  id: string;
  name: string;
  email: string | null;
  accountType: "registered" | "guest";
  verified: boolean;
  createdAt: string;
  ownedTournamentCount: number;
  lastActivityAt: string | null;
}
export interface AdminTournamentSummary {
  id: string;
  name: string;
  mode: string;
  variant: string;
  scoringMode: string;
  createdAt: string;
  endedAt: string | null;
  owner: { id: string; name: string } | null;
  status: "completed" | "in-progress" | "not-started";
  playerCount: number;
  courtCount: number;
  roundCount: number;
}
export interface AdminReport<T> {
  data: T;
  coverage: AdminCoverage;
}
export interface AdminReportPage<T> extends AdminReport<T[]> {
  nextCursor: string | null;
}
export interface AdminUserDetail extends AdminUserSummary {
  performedActivityCount: number;
}
export interface AdminTournamentDetail extends AdminTournamentSummary {
  matchCounts: { recorded: number; completed: number; voided: number };
}
export interface AdminPeriodCounts {
  registeredAccountsCreated: number;
  guestAccountsCreated: number;
  tournamentsCreated: number;
  tournamentsCompleted?: number;
  visits: null;
  activeUsers: null;
}
export interface AdminOverview {
  range: { from: string; to: string; previousFrom: string; previousTo: string; timezone: "Africa/Accra" };
  accounts: { registered: number; guests: number; total: number };
  current: AdminPeriodCounts;
  previous: AdminPeriodCounts;
  daily: {
    date: string;
    registeredAccountsCreated: number;
    guestAccountsCreated: number;
    tournamentsCreated: number;
    tournamentsCompleted?: number;
  }[];
  tournamentsByModeVariant: { mode: string; variant: string; count: number }[];
}
