import { z } from "zod";

const CODE = "[A-Za-z0-9]{4,20}";
const BARE_CODE_PATTERN = new RegExp(`^${CODE}$`);
const LIVE_LINK_PATTERN = new RegExp(
  `^(?:https?://)?(?:www\\.)?padelmix\\.app/(?:[a-z]{2}(?:-[a-z]{2})?/)?live/(${CODE})(?:[/?#].*)?$`,
  "i"
);

/**
 * Extract the tournament code from a PadelMix live link (or a bare code).
 * Returns null for anything else, so callers never forward an arbitrary URL.
 */
export function parsePadelMixCode(input: string): string | null {
  const value = input.trim();
  if (BARE_CODE_PATTERN.test(value)) {
    return value;
  }
  return LIVE_LINK_PATTERN.exec(value)?.[1] ?? null;
}

export const importPadelMixSchema = z.object({
  url: z
    .string()
    .trim()
    .min(1)
    .max(300)
    .refine((value) => parsePadelMixCode(value) !== null, {
      message: "Paste a PadelMix live link, e.g. https://padelmix.app/live/ABC123."
    })
});

export type ImportPadelMixInput = z.infer<typeof importPadelMixSchema>;
