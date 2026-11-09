export interface UsageCounts {
  partial: boolean;
  visits: number | null;
  activeUsers: number | null;
  logins: number | null;
  accountsCreated: number | null;
  tournamentsCreated: number | null;
}
export interface AdminUsage {
  range: { from: string; to: string; previousFrom: string; previousTo: string; timezone: "Africa/Accra" };
  collecting: { visits: boolean; business: boolean };
  starts: { visits: string | null; business: string | null };
  rawAvailableFrom: string;
  current: UsageCounts;
  previous: UsageCounts;
  daily: { date: string; visits: number }[];
}
export interface AdminActivity {
  id: string;
  occurredAt: string;
  kind: string;
  surface: string;
  route: string | null;
  actorUserId: string | null;
  ownerId: string | null;
  targetId: string | null;
  action: string | null;
}
