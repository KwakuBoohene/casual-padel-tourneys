import test from "node:test";
import assert from "node:assert/strict";

import { normalizeFromAddress } from "../../../src/lib/mail/fromAddress.js";
import { escapeHtml, renderEmail } from "../../../src/lib/mail/layout.js";
import { buildAuthEmail } from "../../../src/modules/auth/infrastructure/MailAuthNotifier.js";

test("normalizeFromAddress strips quotes leaked from env files", () => {
  const expected = "Casual Padel <noreply@example.com>";
  assert.equal(normalizeFromAddress('"Casual Padel <noreply@example.com>"'), expected);
  assert.equal(normalizeFromAddress("'Casual Padel <noreply@example.com>'"), expected);
  assert.equal(normalizeFromAddress('"Casual Padel" <noreply@example.com>'), expected);
  assert.equal(normalizeFromAddress('\\"Casual Padel <noreply@example.com>'), expected);
  assert.equal(normalizeFromAddress(`  ${expected}  `), expected);
});

test("normalizeFromAddress keeps bare addresses and quotes special names", () => {
  assert.equal(normalizeFromAddress("noreply@example.com"), "noreply@example.com");
  assert.equal(normalizeFromAddress("<noreply@example.com>"), "noreply@example.com");
  assert.equal(normalizeFromAddress("Padel, Inc. <a@example.com>"), '"Padel, Inc." <a@example.com>');
});

test("renderEmail escapes content and includes CTA in both bodies", () => {
  const url = "https://example.com/auth?token=a&b=<x>";
  const { html, text } = renderEmail({
    preheader: "Preview",
    heading: "Hi <script>",
    paragraphs: ["Tom & Jerry"],
    cta: { label: "Go", url },
    note: "Expires soon",
    footer: "Ignore if unexpected"
  });
  assert.ok(!html.includes("<script>"));
  assert.ok(html.includes("Hi &lt;script&gt;"));
  assert.ok(html.includes("Tom &amp; Jerry"));
  assert.ok(html.includes(`href="${escapeHtml(url)}"`));
  assert.ok(text.includes(url));
  assert.ok(text.startsWith("Hi <script>\n"));
  assert.ok(!text.includes("<p>"));
});

test("admin sign-in email reads cleanly", () => {
  const previous = process.env.ADMIN_WEB_BASE_URL;
  process.env.ADMIN_WEB_BASE_URL = "https://admin.example.com/";
  try {
    const email = buildAuthEmail("ADMIN_SIGN_IN", "tok123");
    assert.equal(email.subject, "Your Casual Padel admin sign-in link");
    assert.ok(email.html.includes("Sign in to platform admin"));
    assert.ok(email.html.includes("expires in 15 minutes"));
    assert.ok(!email.text.includes("(expires in 15 minutes):"));
    assert.match(email.text, /tok123/);
  } finally {
    if (previous === undefined) delete process.env.ADMIN_WEB_BASE_URL;
    else process.env.ADMIN_WEB_BASE_URL = previous;
  }
});
