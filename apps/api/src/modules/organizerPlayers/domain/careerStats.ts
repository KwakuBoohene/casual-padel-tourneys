import type {
  OrganizerPlayerDetail,
  OrganizerPlayerLeaderboard,
  OrganizerPlayerLeaderboardMode,
  OrganizerPlayerRange
} from "@padel/shared";

/** One credited match result for one career identity. */
export interface CareerDelta {
  organizerPlayerId: string;
  organizerPlayerName: string;
  tournamentId: string;
  tournamentName: string;
  gamesWon: number;
  gamesLost: number;
  matchesWon: number;
  matchesLost: number;
}

const MAX_RECENT_EVENTS = 12;

export function buildLeaderboard(
  range: OrganizerPlayerRange,
  deltas: CareerDelta[],
  filters?: { mode?: OrganizerPlayerLeaderboardMode; q?: string }
): OrganizerPlayerLeaderboard {
  const byPlayer = new Map<
    string,
    {
      id: string;
      name: string;
      gamesWon: number;
      matchesWon: number;
      gamesLost: number;
      matchesLost: number;
      events: Set<string>;
    }
  >();

  for (const delta of deltas) {
    const current = byPlayer.get(delta.organizerPlayerId) ?? {
      id: delta.organizerPlayerId,
      name: delta.organizerPlayerName,
      gamesWon: 0,
      matchesWon: 0,
      gamesLost: 0,
      matchesLost: 0,
      events: new Set<string>()
    };
    current.gamesWon += delta.gamesWon;
    current.matchesWon += delta.matchesWon;
    current.gamesLost += delta.gamesLost;
    current.matchesLost += delta.matchesLost;
    current.events.add(delta.tournamentId);
    byPlayer.set(delta.organizerPlayerId, current);
  }

  let rows = [...byPlayer.values()]
    .sort((a, b) => {
      if (b.matchesWon !== a.matchesWon) return b.matchesWon - a.matchesWon;
      if (b.gamesWon !== a.gamesWon) return b.gamesWon - a.gamesWon;
      return a.name.localeCompare(b.name);
    })
    .map((row, index) => ({
      rank: index + 1,
      id: row.id,
      name: row.name,
      gamesWon: row.gamesWon,
      matchesWon: row.matchesWon,
      gamesLost: row.gamesLost,
      matchesLost: row.matchesLost,
      eventsPlayed: row.events.size
    }));

  const q = filters?.q?.trim().toLowerCase();
  if (q) {
    rows = rows.filter((row) => row.name.toLowerCase().includes(q));
    rows = rows.map((row, index) => ({ ...row, rank: index + 1 }));
  }

  return {
    range,
    rows,
    ...(filters?.mode && filters.mode !== "overall" ? { mode: filters.mode } : {}),
    ...(q ? { q: filters?.q?.trim() } : {})
  };
}

/** `deltas` must already be ordered newest first so `recentEvents` stays recent. */
export function buildDetail(
  player: { id: string; name: string },
  range: OrganizerPlayerRange,
  deltas: CareerDelta[]
): OrganizerPlayerDetail {
  let gamesWon = 0;
  let matchesWon = 0;
  let gamesLost = 0;
  let matchesLost = 0;
  const byEvent = new Map<
    string,
    { tournamentId: string; tournamentName: string; gamesWon: number; matchesWon: number }
  >();

  for (const delta of deltas) {
    gamesWon += delta.gamesWon;
    matchesWon += delta.matchesWon;
    gamesLost += delta.gamesLost;
    matchesLost += delta.matchesLost;
    const event = byEvent.get(delta.tournamentId) ?? {
      tournamentId: delta.tournamentId,
      tournamentName: delta.tournamentName,
      gamesWon: 0,
      matchesWon: 0
    };
    event.gamesWon += delta.gamesWon;
    event.matchesWon += delta.matchesWon;
    byEvent.set(delta.tournamentId, event);
  }

  return {
    id: player.id,
    name: player.name,
    range,
    gamesWon,
    matchesWon,
    gamesLost,
    matchesLost,
    eventsPlayed: byEvent.size,
    recentEvents: [...byEvent.values()].slice(0, MAX_RECENT_EVENTS)
  };
}
