import type {
  OrganizerPlayerDetail,
  OrganizerPlayerLeaderboard,
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
  setsWon: number;
  setsLost: number;
  matchesWon: number;
  matchesLost: number;
}

const MAX_RECENT_EVENTS = 12;

interface AggregatedCareer {
  id: string;
  name: string;
  matchesWon: number;
  matchesLost: number;
  setsWon: number;
  setsLost: number;
  gamesWon: number;
  gamesLost: number;
  events: Set<string>;
}

function emptyCareer(id: string, name: string): AggregatedCareer {
  return {
    id,
    name,
    matchesWon: 0,
    matchesLost: 0,
    setsWon: 0,
    setsLost: 0,
    gamesWon: 0,
    gamesLost: 0,
    events: new Set<string>()
  };
}

function addDelta(current: AggregatedCareer, delta: CareerDelta): void {
  current.matchesWon += delta.matchesWon;
  current.matchesLost += delta.matchesLost;
  current.setsWon += delta.setsWon;
  current.setsLost += delta.setsLost;
  current.gamesWon += delta.gamesWon;
  current.gamesLost += delta.gamesLost;
  current.events.add(delta.tournamentId);
}

/** Matches won, then sets won, then games won, then name. */
export function compareCareerRows(
  a: { matchesWon: number; setsWon: number; gamesWon: number; name: string },
  b: { matchesWon: number; setsWon: number; gamesWon: number; name: string }
): number {
  if (b.matchesWon !== a.matchesWon) return b.matchesWon - a.matchesWon;
  if (b.setsWon !== a.setsWon) return b.setsWon - a.setsWon;
  if (b.gamesWon !== a.gamesWon) return b.gamesWon - a.gamesWon;
  return a.name.localeCompare(b.name);
}

export function buildLeaderboard(
  range: OrganizerPlayerRange,
  deltas: CareerDelta[]
): OrganizerPlayerLeaderboard {
  const byPlayer = new Map<string, AggregatedCareer>();

  for (const delta of deltas) {
    const current = byPlayer.get(delta.organizerPlayerId) ?? emptyCareer(
      delta.organizerPlayerId,
      delta.organizerPlayerName
    );
    addDelta(current, delta);
    byPlayer.set(delta.organizerPlayerId, current);
  }

  const rows = [...byPlayer.values()].sort(compareCareerRows).map((row, index) => ({
    rank: index + 1,
    id: row.id,
    name: row.name,
    matchesWon: row.matchesWon,
    matchesLost: row.matchesLost,
    setsWon: row.setsWon,
    setsLost: row.setsLost,
    gamesWon: row.gamesWon,
    gamesLost: row.gamesLost,
    eventsPlayed: row.events.size
  }));

  return { range, rows };
}

/** `deltas` must already be ordered newest first so `recentEvents` stays recent. */
export function buildDetail(
  player: { id: string; name: string },
  range: OrganizerPlayerRange,
  deltas: CareerDelta[]
): OrganizerPlayerDetail {
  let matchesWon = 0;
  let matchesLost = 0;
  let setsWon = 0;
  let setsLost = 0;
  let gamesWon = 0;
  let gamesLost = 0;
  const byEvent = new Map<
    string,
    {
      tournamentId: string;
      tournamentName: string;
      matchesWon: number;
      matchesLost: number;
      setsWon: number;
      setsLost: number;
      gamesWon: number;
      gamesLost: number;
    }
  >();

  for (const delta of deltas) {
    matchesWon += delta.matchesWon;
    matchesLost += delta.matchesLost;
    setsWon += delta.setsWon;
    setsLost += delta.setsLost;
    gamesWon += delta.gamesWon;
    gamesLost += delta.gamesLost;
    const event = byEvent.get(delta.tournamentId) ?? {
      tournamentId: delta.tournamentId,
      tournamentName: delta.tournamentName,
      matchesWon: 0,
      matchesLost: 0,
      setsWon: 0,
      setsLost: 0,
      gamesWon: 0,
      gamesLost: 0
    };
    event.matchesWon += delta.matchesWon;
    event.matchesLost += delta.matchesLost;
    event.setsWon += delta.setsWon;
    event.setsLost += delta.setsLost;
    event.gamesWon += delta.gamesWon;
    event.gamesLost += delta.gamesLost;
    byEvent.set(delta.tournamentId, event);
  }

  return {
    id: player.id,
    name: player.name,
    range,
    matchesWon,
    matchesLost,
    setsWon,
    setsLost,
    gamesWon,
    gamesLost,
    eventsPlayed: byEvent.size,
    recentEvents: [...byEvent.values()].slice(0, MAX_RECENT_EVENTS)
  };
}
