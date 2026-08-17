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
  matchesDrawn: number;
  americanoPointsWon: number;
  americanoPointsLost: number;
}

const MAX_RECENT_EVENTS = 12;

function isAmericanoPointsDelta(delta: CareerDelta): boolean {
  return delta.americanoPointsWon + delta.americanoPointsLost > 0;
}

interface AggregatedCareer {
  id: string;
  name: string;
  matchesWon: number;
  matchesLost: number;
  matchesDrawn: number;
  setsWon: number;
  setsLost: number;
  gamesWon: number;
  gamesLost: number;
  americanoPointsWon: number;
  americanoPointsLost: number;
  events: Set<string>;
}

function emptyCareer(id: string, name: string): AggregatedCareer {
  return {
    id,
    name,
    matchesWon: 0,
    matchesLost: 0,
    matchesDrawn: 0,
    setsWon: 0,
    setsLost: 0,
    gamesWon: 0,
    gamesLost: 0,
    americanoPointsWon: 0,
    americanoPointsLost: 0,
    events: new Set<string>()
  };
}

function addDelta(current: AggregatedCareer, delta: CareerDelta): void {
  current.matchesWon += delta.matchesWon;
  current.matchesLost += delta.matchesLost;
  current.matchesDrawn += delta.matchesDrawn;
  current.americanoPointsWon += delta.americanoPointsWon;
  current.americanoPointsLost += delta.americanoPointsLost;
  current.events.add(delta.tournamentId);
  if (isAmericanoPointsDelta(delta)) {
    return;
  }
  current.setsWon += delta.setsWon;
  current.setsLost += delta.setsLost;
  current.gamesWon += delta.gamesWon;
  current.gamesLost += delta.gamesLost;
}

/** Match-win points, then sets, then regular games, then Americano points, then name. */
export function compareCareerRows(
  a: {
    matchesWon: number;
    setsWon: number;
    gamesWon: number;
    americanoPointsWon: number;
    name: string;
  },
  b: {
    matchesWon: number;
    setsWon: number;
    gamesWon: number;
    americanoPointsWon: number;
    name: string;
  }
): number {
  if (b.matchesWon !== a.matchesWon) return b.matchesWon - a.matchesWon;
  if (b.setsWon !== a.setsWon) return b.setsWon - a.setsWon;
  if (b.gamesWon !== a.gamesWon) return b.gamesWon - a.gamesWon;
  if (b.americanoPointsWon !== a.americanoPointsWon) {
    return b.americanoPointsWon - a.americanoPointsWon;
  }
  return a.name.localeCompare(b.name);
}

function toRow(row: AggregatedCareer, rank: number) {
  return {
    rank,
    id: row.id,
    name: row.name,
    matchesWon: row.matchesWon,
    matchesLost: row.matchesLost,
    matchesDrawn: row.matchesDrawn,
    setsWon: row.setsWon,
    setsLost: row.setsLost,
    gamesWon: row.gamesWon,
    gamesLost: row.gamesLost,
    americanoPointsWon: row.americanoPointsWon,
    americanoPointsLost: row.americanoPointsLost,
    eventsPlayed: row.events.size
  };
}

export function buildLeaderboard(
  range: OrganizerPlayerRange,
  deltas: CareerDelta[]
): OrganizerPlayerLeaderboard {
  const byPlayer = new Map<string, AggregatedCareer>();

  for (const delta of deltas) {
    const current =
      byPlayer.get(delta.organizerPlayerId) ??
      emptyCareer(delta.organizerPlayerId, delta.organizerPlayerName);
    addDelta(current, delta);
    byPlayer.set(delta.organizerPlayerId, current);
  }

  const rows = [...byPlayer.values()].sort(compareCareerRows).map((row, index) => toRow(row, index + 1));
  return { range, rows };
}

type EventAgg = {
  tournamentId: string;
  tournamentName: string;
  matchesWon: number;
  matchesLost: number;
  matchesDrawn: number;
  setsWon: number;
  setsLost: number;
  gamesWon: number;
  gamesLost: number;
  americanoPointsWon: number;
  americanoPointsLost: number;
};

function emptyEvent(delta: CareerDelta): EventAgg {
  return {
    tournamentId: delta.tournamentId,
    tournamentName: delta.tournamentName,
    matchesWon: 0,
    matchesLost: 0,
    matchesDrawn: 0,
    setsWon: 0,
    setsLost: 0,
    gamesWon: 0,
    gamesLost: 0,
    americanoPointsWon: 0,
    americanoPointsLost: 0
  };
}

/** `deltas` must already be ordered newest first so `recentEvents` stays recent. */
export function buildDetail(
  player: { id: string; name: string },
  range: OrganizerPlayerRange,
  deltas: CareerDelta[]
): OrganizerPlayerDetail {
  const totals = emptyCareer(player.id, player.name);
  const byEvent = new Map<string, EventAgg>();

  for (const delta of deltas) {
    addDelta(totals, delta);
    const event = byEvent.get(delta.tournamentId) ?? emptyEvent(delta);
    event.matchesWon += delta.matchesWon;
    event.matchesLost += delta.matchesLost;
    event.matchesDrawn += delta.matchesDrawn;
    event.americanoPointsWon += delta.americanoPointsWon;
    event.americanoPointsLost += delta.americanoPointsLost;
    if (!isAmericanoPointsDelta(delta)) {
      event.setsWon += delta.setsWon;
      event.setsLost += delta.setsLost;
      event.gamesWon += delta.gamesWon;
      event.gamesLost += delta.gamesLost;
    }
    byEvent.set(delta.tournamentId, event);
  }

  return {
    id: player.id,
    name: player.name,
    range,
    matchesWon: totals.matchesWon,
    matchesLost: totals.matchesLost,
    matchesDrawn: totals.matchesDrawn,
    setsWon: totals.setsWon,
    setsLost: totals.setsLost,
    gamesWon: totals.gamesWon,
    gamesLost: totals.gamesLost,
    americanoPointsWon: totals.americanoPointsWon,
    americanoPointsLost: totals.americanoPointsLost,
    eventsPlayed: byEvent.size,
    recentEvents: [...byEvent.values()].slice(0, MAX_RECENT_EVENTS)
  };
}
