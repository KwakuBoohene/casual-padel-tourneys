import assert from "node:assert/strict";
import test from "node:test";

import { ApiError } from "../../../src/api/errors.ts";
import { parseInviteUrl, parseStoredInvite } from "../../../src/api/inviteLinks.ts";
import {
  draftInviteProblem,
  inviteEmailProblem,
  inviteErrorMessage
} from "../../../src/utilities/organizer/draftShareMessages.ts";

const token = "a".repeat(48);
const apiError = (status: number, code?: string, message = "server says") => new ApiError({ message, status, code });

test("invite links: draft and organizer links are told apart, tokens only from the hash", () => {
  assert.equal(parseInviteUrl(`https://app.example/invite/draft#token=${token}`, "draft"), token);
  assert.equal(parseInviteUrl(`https://app.example/invite/draft#token=${token}`, "organizer"), null);
  assert.equal(parseInviteUrl(`https://app.example/invite/accept#token=${token}`, "draft"), null);
  assert.equal(parseInviteUrl(`https://app.example/invite/draft?token=${token}`, "draft"), null);
  assert.equal(parseInviteUrl("https://app.example/invite/draft#token=short", "draft"), null);
  assert.equal(parseInviteUrl("padel://invite/draft#token=" + token, "draft"), token);
});

test("stored invites keep their kind; legacy values are organizer invites", () => {
  const later = Date.now() + 60_000;
  assert.deepEqual(parseStoredInvite(JSON.stringify({ kind: "draft", token, expiresAt: later })), { kind: "draft", token });
  assert.deepEqual(parseStoredInvite(JSON.stringify({ token, expiresAt: later })), { kind: "organizer", token });
  assert.equal(parseStoredInvite(JSON.stringify({ kind: "draft", token, expiresAt: Date.now() - 1 })), null);
  assert.equal(parseStoredInvite("not json"), null);
});

test("email field validation", () => {
  assert.equal(inviteEmailProblem(""), "Enter an email address.");
  assert.equal(inviteEmailProblem("sam@"), "Enter a valid email address.");
  assert.equal(inviteEmailProblem(" Me@Example.com ", "me@example.com"), "That's your own email.");
  assert.equal(inviteEmailProblem("sam@example.com", "me@example.com"), null);
});

test("invite server errors map to inline messages", () => {
  assert.match(inviteErrorMessage(apiError(429)), /Try again in an hour/);
  assert.equal(inviteErrorMessage(apiError(409, "ALREADY_HAS_ACCESS", "Sam already edits this draft.")), "Sam already edits this draft.");
  assert.equal(inviteErrorMessage(apiError(409, undefined, "There are already 10 pending invitations.")), "There are already 10 pending invitations.");
  assert.match(inviteErrorMessage(new TypeError("Network request failed")), /connection/);
});

test("invite screen problems: mismatch, invalid, unavailable", () => {
  const mismatch = draftInviteProblem(apiError(403, "DRAFT_INVITATION_EMAIL_MISMATCH", "Sign in with s***@example.com to use this invitation."), "Kwaku");
  assert.equal(mismatch.kind, "mismatch");
  assert.match(mismatch.message, /ask Kwaku to send a new invitation/);
  const invalid = draftInviteProblem(apiError(410, "DRAFT_INVITATION_INVALID"), "Kwaku");
  assert.equal(invalid.kind, "invalid");
  assert.match(invalid.message, /Ask Kwaku to send a new invitation/);
  assert.equal(draftInviteProblem(apiError(404)).kind, "unavailable");
  assert.equal(draftInviteProblem(apiError(409, undefined, "You already own this draft.")).message, "You already own this draft.");
});
