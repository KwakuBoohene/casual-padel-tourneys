import { z } from "zod";

export const requestMagicLinkSchema = z.object({
  email: z.string().trim().email().max(320)
});

export const consumeMagicLinkSchema = z.object({
  token: z.string().trim().min(20).max(200)
});

export type RequestMagicLinkInput = z.infer<typeof requestMagicLinkSchema>;
export type ConsumeMagicLinkInput = z.infer<typeof consumeMagicLinkSchema>;
