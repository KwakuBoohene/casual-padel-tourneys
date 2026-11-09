import { z } from "zod";
export const USAGE_SESSION_MS = 30 * 60_000;
export const USAGE_RAW_DAYS = 90;
export const USAGE_AGGREGATE_MONTHS = 13;
export const USAGE_BATCH_LIMIT = 20;
export const usageRouteSchema = z.enum([
  "home",
  "tournaments",
  "tournament",
  "leaderboard",
  "create",
  "players",
  "profile",
  "estimator",
  "organizer-access",
  "historical-results"
]);
export const usageVisitSchema = z
  .object({
    id: z.string().uuid(),
    sessionId: z.string().uuid(),
    route: usageRouteSchema,
    occurredAt: z.string().datetime()
  })
  .strict();
export const usageBatchSchema = z
  .object({
    consent: z.literal(true),
    surface: z.literal("organizer"),
    events: z.array(usageVisitSchema).min(1).max(USAGE_BATCH_LIMIT)
  })
  .strict();
export type UsageVisit = z.infer<typeof usageVisitSchema>;
export type UsageBatch = z.infer<typeof usageBatchSchema>;
export type UsageSurface = UsageBatch["surface"];
export type UsageRoute = UsageVisit["route"];
export const usageActivityQuerySchema = z
  .object({
    from: z.string().datetime({ offset: true }).optional(),
    to: z.string().datetime({ offset: true }).optional(),
    actorUserId: z
      .string()
      .regex(/^[A-Za-z0-9_-]{1,128}$/)
      .optional(),
    ownerId: z
      .string()
      .regex(/^[A-Za-z0-9_-]{1,128}$/)
      .optional(),
    kind: z
      .enum([
        "visit",
        "login",
        "account.created",
        "account.converted",
        "tournament.created",
        "business.action"
      ])
      .optional(),
    cursor: z
      .string()
      .max(1024)
      .regex(/^[A-Za-z0-9_-]+$/)
      .optional(),
    limit: z.coerce.number().int().min(1).max(100).default(25)
  })
  .strict()
  .refine(
    (q) =>
      Boolean(q.from) === Boolean(q.to) &&
      (!q.from ||
        !q.to ||
        (Date.parse(q.to) > Date.parse(q.from) && Date.parse(q.to) - Date.parse(q.from) <= 366 * 86_400_000)),
    "Invalid activity range."
  );
export type UsageActivityQuery = z.infer<typeof usageActivityQuerySchema>;
export const usageSessionSchema = z
  .object({
    id: z.string().uuid(),
    lastAt: z.number().finite().nonnegative(),
    route: usageRouteSchema,
    actor: z.string().min(1).max(128)
  })
  .strict();
