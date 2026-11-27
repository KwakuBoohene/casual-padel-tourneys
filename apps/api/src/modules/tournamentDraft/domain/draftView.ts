import {
  draftToCreateBodies,
  getDraftReadiness,
  normalizeTournamentMode,
  tournamentDraftPayloadSchema,
  type DraftReadiness,
  type DraftRole,
  type TournamentDraftPayload,
  type TournamentDraftSummary
} from "@padel/shared";

/** Persisted draft as the use-cases see it (no Prisma types). */
export interface DraftRecord {
  id: string;
  organizerId: string;
  name: string;
  mode: string;
  payload: unknown;
  version: number;
  keepAccessAfterStart: boolean;
  startedTournamentId: string | null;
  updatedAt: Date;
  updatedBy: { id: string; name: string } | null;
  owner: { id: string; name: string };
  /** Active per-draft editors. */
  editors: { id: string; name: string }[];
}

export interface DraftDetail {
  id: string;
  organizerId: string;
  name: string;
  mode: TournamentDraftSummary["mode"];
  payload: TournamentDraftPayload;
  version: number;
  role: DraftRole;
  keepAccessAfterStart: boolean;
  startedTournamentId: string | null;
  updatedAt: string;
  updatedBy: { id: string; name: string };
  readiness: DraftReadiness;
}

const UNKNOWN_EDITOR = { id: "", name: "Organizer" };

/** Stored payloads were validated on write; re-parse defensively so old rows can't break reads. */
export function parseStoredPayload(record: Pick<DraftRecord, "payload" | "mode">): TournamentDraftPayload {
  const parsed = tournamentDraftPayloadSchema.safeParse(record.payload);
  if (parsed.success) return parsed.data;
  return tournamentDraftPayloadSchema.parse({ mode: normalizeTournamentMode(record.mode) });
}

/** Players (or team/pair members) with a typed name — what list rows show. */
export function draftPlayerCount(payload: TournamentDraftPayload): number {
  const bodies = draftToCreateBodies(payload);
  if (bodies.kind === "KING_OF_THE_COURT") {
    return bodies.assign.courts.reduce((sum, court) => sum + court.units.length * 2, 0);
  }
  const teams = bodies.create.teams ?? [];
  return teams.length > 0 ? teams.length * 2 : (bodies.create.players ?? []).length;
}

export function toDraftDetail(record: DraftRecord, role: DraftRole): DraftDetail {
  const payload = parseStoredPayload(record);
  return {
    id: record.id,
    organizerId: record.organizerId,
    name: record.name,
    mode: payload.mode,
    payload,
    version: record.version,
    role,
    keepAccessAfterStart: record.keepAccessAfterStart,
    startedTournamentId: record.startedTournamentId,
    updatedAt: record.updatedAt.toISOString(),
    updatedBy: record.updatedBy ?? UNKNOWN_EDITOR,
    readiness: getDraftReadiness(payload)
  };
}

export function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const letters = parts.length > 1 ? parts[0][0] + parts[parts.length - 1][0] : (parts[0] ?? "?").slice(0, 2);
  return letters.toUpperCase();
}

/** Avatars for list rows: empty unless the draft is shared with at least one editor. */
function collaboratorsOf(record: DraftRecord): TournamentDraftSummary["collaborators"] {
  if (record.editors.length === 0) return [];
  return [record.owner, ...record.editors].map((person) => ({
    userId: person.id,
    name: person.name,
    initials: initialsOf(person.name)
  }));
}

export function toDraftSummary(record: DraftRecord, role: DraftRole): TournamentDraftSummary {
  const payload = parseStoredPayload(record);
  const readiness = getDraftReadiness(payload);
  return {
    id: record.id,
    name: record.name,
    mode: payload.mode,
    ...("variant" in payload && payload.variant ? { variant: payload.variant } : {}),
    playerCount: draftPlayerCount(payload),
    ...(payload.courts ? { courts: payload.courts } : {}),
    role,
    version: record.version,
    updatedAt: record.updatedAt.toISOString(),
    updatedBy: record.updatedBy ?? UNKNOWN_EDITOR,
    collaborators: collaboratorsOf(record),
    readiness: { ready: readiness.ready, ...(readiness.blockingReason ? { blockingReason: readiness.blockingReason } : {}) }
  };
}
