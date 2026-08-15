export type {
  KohEngineCourt,
  KohEnginePromotionRule,
  KohEngineUnit,
  KohMatchResultEvent,
  KohPromotionNotify
} from "./types.js";

export {
  applyKohMatchResult,
  assertDoublesQueue,
  challengerOf,
  kingOf,
  shuffleQueueOnce,
  waitingOf
} from "./winnerStays.js";

export { findWeakestCandidates, maybePromote } from "./promotion.js";
