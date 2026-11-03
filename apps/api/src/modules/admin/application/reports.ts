import type {
  AdminUsersQuery,
  AdminTournamentsQuery,
  AdminOverview,
  AdminReport,
  AdminReportPage,
  AdminUserSummary,
  AdminUserDetail,
  AdminTournamentSummary,
  AdminTournamentDetail
} from "@padel/shared";
export interface AdminReports {
  overview(input: { from?: string; to?: string }): Promise<AdminReport<AdminOverview>>;
  users(query: AdminUsersQuery): Promise<AdminReportPage<AdminUserSummary>>;
  user(id: string): Promise<AdminReport<AdminUserDetail>>;
  tournaments(query: AdminTournamentsQuery): Promise<AdminReportPage<AdminTournamentSummary>>;
  tournament(id: string): Promise<AdminReport<AdminTournamentDetail>>;
}
