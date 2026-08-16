import type { OrganizerPlayerLeaderboardMode } from "@padel/shared";

import type { CareerDelta } from "../domain/careerStats.js";

export interface CareerDeltaQuery {
  organizerId: string;
  /** `null` = no lower bound (the `all` range). */
  since: Date | null;
  organizerPlayerId?: string;
  mode?: OrganizerPlayerLeaderboardMode;
  q?: string;
}

export interface OrganizerPlayerRepository {
  /** Credited match results, newest first. */
  listDeltas(query: CareerDeltaQuery): Promise<CareerDelta[]>;
  findPlayer(organizerId: string, organizerPlayerId: string): Promise<{ id: string; name: string } | null>;
}

export interface OrganizerPlayersDeps {
  repo: OrganizerPlayerRepository;
}
