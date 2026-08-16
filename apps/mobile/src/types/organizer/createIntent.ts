import type { TournamentMode } from "@padel/shared";

import type { EstimatorCreateDraft } from "./tournament";

export type CreateRouteIntent =
  | { kind: "mode"; mode: TournamentMode }
  | { kind: "estimator"; draft: EstimatorCreateDraft };
