import { z } from "zod";

export const requestMagicLinkSchema = z.object({
  email: z.string().trim().email().max(320)
});

export const consumeMagicLinkSchema = z.object({
  token: z.string().trim().min(20).max(200)
});

const protocolCiphertext = z.string().trim().min(1).max(10_000);

export const passwordRegisterStartSchema = z.object({
  email: z.string().trim().email().max(320),
  registrationRequest: protocolCiphertext
});

export const passwordRegisterFinishSchema = z.object({
  email: z.string().trim().email().max(320),
  registrationRecord: protocolCiphertext
});

export const passwordLoginStartSchema = z.object({
  email: z.string().trim().email().max(320),
  startLoginRequest: protocolCiphertext
});

export const passwordLoginFinishSchema = z.object({
  email: z.string().trim().email().max(320),
  loginId: z.string().trim().min(8).max(200),
  finishLoginRequest: protocolCiphertext
});

export type RequestMagicLinkInput = z.infer<typeof requestMagicLinkSchema>;
export type ConsumeMagicLinkInput = z.infer<typeof consumeMagicLinkSchema>;
export type PasswordRegisterStartInput = z.infer<typeof passwordRegisterStartSchema>;
export type PasswordRegisterFinishInput = z.infer<typeof passwordRegisterFinishSchema>;
export type PasswordLoginStartInput = z.infer<typeof passwordLoginStartSchema>;
export type PasswordLoginFinishInput = z.infer<typeof passwordLoginFinishSchema>;
