import { ApiError } from "../../api/errors";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Client-side check before `POST /drafts/:id/invitations`; null when the email looks fine. */
export function inviteEmailProblem(email: string, ownEmail?: string | null): string | null {
  const value = email.trim().toLowerCase();
  if (!value) return "Enter an email address.";
  if (value.length > 254 || !EMAIL.test(value)) return "Enter a valid email address.";
  if (ownEmail && value === ownEmail.trim().toLowerCase()) return "That's your own email.";
  return null;
}

/** Inline message under the email field for a failed invite / resend. */
export function inviteErrorMessage(error: unknown): string {
  if (!(error instanceof ApiError)) return "Couldn't send the invitation. Check your connection and try again.";
  if (error.status === 429) return "Too many invitations for this draft. Try again in an hour.";
  if (error.code === "ALREADY_HAS_ACCESS") return error.message || "They already have access to this draft.";
  if (error.status === 503) return "Invitations aren't available right now. Try again later.";
  return error.message || "Couldn't send the invitation.";
}

export type DraftInviteProblem =
  | { kind: "mismatch"; message: string }
  | { kind: "invalid"; message: string }
  | { kind: "unavailable"; message: string }
  | { kind: "failed"; message: string };

/** Preview / accept / decline errors → dedicated invite-screen messages (Figma 06). */
export function draftInviteProblem(error: unknown, inviterName?: string): DraftInviteProblem {
  const resend = `Ask ${inviterName?.trim() || "the organizer"} to send a new invitation.`;
  if (!(error instanceof ApiError)) {
    return { kind: "failed", message: "Couldn't reach the server. Check your connection and try again." };
  }
  if (error.code === "DRAFT_INVITATION_EMAIL_MISMATCH") {
    return { kind: "mismatch", message: `${error.message} Or ${resend.charAt(0).toLowerCase()}${resend.slice(1)}` };
  }
  if (error.code === "DRAFT_INVITATION_INVALID" || error.status === 410) {
    return { kind: "invalid", message: `This invitation has expired, was revoked, or the draft has already started. ${resend}` };
  }
  if (error.status === 404) return { kind: "unavailable", message: "Draft sharing isn't available right now." };
  if (error.status === 409) return { kind: "failed", message: error.message };
  return { kind: "failed", message: error.message || "Something went wrong with this invitation." };
}
