import { z } from "zod";
const dates = {
  from: z.string().datetime({ offset: true }).optional(),
  to: z.string().datetime({ offset: true }).optional()
};
function range(value: { from?: string; to?: string }, ctx: z.RefinementCtx) {
  if (
    Boolean(value.from) !== Boolean(value.to) ||
    (value.from &&
      value.to &&
      (Date.parse(value.to) <= Date.parse(value.from) ||
        Date.parse(value.to) - Date.parse(value.from) > 366 * 86_400_000))
  ) {
    ctx.addIssue({
      code: "custom",
      message: "Provide both from and to, increasing and no more than 366 days apart."
    });
  }
}
const page = {
  ...dates,
  limit: z.coerce.number().int().min(1).max(100).default(25),
  cursor: z
    .string()
    .min(1)
    .max(1024)
    .regex(/^[A-Za-z0-9_-]+$/)
    .optional(),
  sort: z.enum(["newest", "oldest"]).default("newest")
};
export const adminOverviewQuerySchema = z.object(dates).strict().superRefine(range);
export const adminUsersQuerySchema = z
  .object({
    ...page,
    q: z.string().trim().min(1).max(254).optional(),
    accountType: z.enum(["registered", "guest"]).optional(),
    verification: z.enum(["verified", "unverified"]).optional()
  })
  .strict()
  .superRefine(range);
export const adminTournamentsQuerySchema = z
  .object({
    ...page,
    ownerId: z.string().min(1).max(128).optional(),
    mode: z.enum(["AMERICANO", "MEXICANO", "KING_OF_THE_COURT"]).optional(),
    variant: z.enum(["CLASSIC", "MIXED", "TEAM"]).optional(),
    status: z.enum(["completed", "in-progress", "not-started"]).optional()
  })
  .strict()
  .superRefine(range);
export const adminReportIdSchema = z.string().regex(/^[A-Za-z0-9_-]{1,128}$/);
export type AdminUsersQuery = z.infer<typeof adminUsersQuerySchema>;
export type AdminTournamentsQuery = z.infer<typeof adminTournamentsQuerySchema>;
