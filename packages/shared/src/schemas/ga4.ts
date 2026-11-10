import { z } from "zod";

export const viewerGa4Page = z.enum(["tournament_overview", "scoreboard", "leaderboard"]);
export const organizerGa4Feature = z.enum([
  "tournaments", "setup", "live_scoring", "leaderboard", "player_management",
  "profile", "estimator", "organizer_access", "historical_results"
]);
export const ga4Acquisition = z.enum(["direct", "google", "bing", "facebook", "instagram", "whatsapp", "other_referral"]);
export const ga4CreationStep = z.enum(["name", "options", "players", "scoring_mode", "settings", "pairing", "format", "deuce", "courts", "promotion", "assign", "review"]);
const transport = {
  consent: z.literal(true),
  clientId: z.string().uuid({ version: "v4" }),
  sessionId: z.number().int().positive().max(9_999_999_999),
  device: z.enum(["desktop", "tablet", "mobile"])
};
export const viewerGa4Event = z.strictObject({
  ...transport, event: z.literal("page_view"), page: viewerGa4Page, acquisition: ga4Acquisition
});
const organizerActions = {
  page: { event: z.literal("page_view"), feature: organizerGa4Feature },
  start: { event: z.literal("creation_started") },
  step: { event: z.literal("creation_step_reached"), step: ga4CreationStep },
  success: { event: z.literal("creation_succeeded") }
};
export const organizerGa4Event = z.discriminatedUnion("event", [
  z.strictObject({ ...transport, ...organizerActions.page }),
  z.strictObject({ ...transport, ...organizerActions.start }),
  z.strictObject({ ...transport, ...organizerActions.step }),
  z.strictObject({ ...transport, ...organizerActions.success })
]);
export type ViewerGa4Event = z.infer<typeof viewerGa4Event>;
export type OrganizerGa4Event = z.infer<typeof organizerGa4Event>;
type Action<T> = T extends { event: string } ? Omit<T, keyof typeof transport> : never;
export type OrganizerGa4Action = Action<OrganizerGa4Event>;
export type ViewerGa4Action = Action<ViewerGa4Event>;
export type Ga4Envelope = Pick<ViewerGa4Event, keyof typeof transport>;
export type Ga4CreationStep = z.infer<typeof ga4CreationStep>;

export function ga4Device(agent: string, touchPoints: number): ViewerGa4Event["device"] {
  if (/iPad|Tablet/i.test(agent) || (/Macintosh/i.test(agent) && touchPoints > 1)) return "tablet";
  if (/Android/i.test(agent) && !/Mobile/i.test(agent)) return "tablet";
  return /Mobile|iPhone|Android/i.test(agent) ? "mobile" : "desktop";
}
