import { assignKohCourtsSchema, createKohTournamentSchema } from "../schemas/koh.js";
import { createTournamentSchema } from "../schemas/tournament.js";
import type { DraftRole, TournamentDraftPayload } from "../schemas/tournamentDraft.js";
import type { TournamentMode, TournamentVariant } from "../types/domain.js";
import { draftToCreateBodies, isKohDraftPayload } from "./createBodies.js";
import {
  americanoMexicanoFormatItem,
  americanoMexicanoPlayersItem,
  americanoMexicanoScoringItem,
  courtsItem,
  kohPlayersItem,
  kohScoringItem,
  nameItem,
  type DraftReadinessItem
} from "./readinessItems.js";

export interface DraftReadiness {
  /** True exactly when the full create schema(s) accept the normalized draft. */
  ready: boolean;
  items: DraftReadinessItem[];
  /** Short reason Start is disabled, e.g. "Add 2 more players to start". */
  blockingReason?: string;
}

function readinessItems(payload: TournamentDraftPayload): DraftReadinessItem[] {
  if (isKohDraftPayload(payload)) {
    return [
      nameItem(payload.name),
      { key: "format", label: "King of the Court", status: "ok" },
      courtsItem(payload.courts),
      kohScoringItem(payload),
      kohPlayersItem(payload)
    ];
  }
  return [
    nameItem(payload.name),
    americanoMexicanoFormatItem(payload),
    courtsItem(payload.courts),
    americanoMexicanoScoringItem(payload),
    americanoMexicanoPlayersItem(payload)
  ];
}

/** First validation message from the full create schema(s), or null when they pass. */
export function fullSchemaIssue(payload: TournamentDraftPayload): string | null {
  const bodies = draftToCreateBodies(payload);
  const results =
    bodies.kind === "KING_OF_THE_COURT"
      ? [createKohTournamentSchema.safeParse(bodies.create), assignKohCourtsSchema.safeParse(bodies.assign)]
      : [createTournamentSchema.safeParse(bodies.create)];
  for (const result of results) {
    if (!result.success) return result.error.issues[0]?.message ?? "This draft isn't ready to start.";
  }
  return null;
}

/** Pure: what's missing before this draft can start. */
export function getDraftReadiness(payload: TournamentDraftPayload): DraftReadiness {
  const items = readinessItems(payload);
  const firstMissing = items.find((item) => item.status === "missing");
  if (firstMissing) return { ready: false, items, blockingReason: firstMissing.label };
  const issue = fullSchemaIssue(payload);
  return issue ? { ready: false, items, blockingReason: issue } : { ready: true, items };
}

/** List-row shape for `GET /drafts` (built by the API, rendered by mobile). */
export interface TournamentDraftSummary {
  id: string;
  name: string;
  mode: TournamentMode;
  variant?: TournamentVariant;
  playerCount: number;
  courts?: number;
  role: DraftRole;
  version: number;
  updatedAt: string;
  updatedBy: { id: string; name: string };
  collaborators: { userId: string; name: string; initials: string }[];
  readiness: Pick<DraftReadiness, "ready" | "blockingReason">;
}
