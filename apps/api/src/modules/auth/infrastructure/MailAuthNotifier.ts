import { getMailer } from "../../../lib/mail/index.js";
import { renderEmail, type EmailContent } from "../../../lib/mail/layout.js";
import type { AuthEmailKind, AuthNotifier } from "../application/ports.js";
import { buildAdminSignInUrl, buildMagicLinkUrl, buildPasswordResetUrl } from "./authLinks.js";

type Template = {
  subject: string;
  content: (url: string) => EmailContent;
  link: (rawToken: string) => string;
};

const EXPIRY_NOTE = "For your security, this link expires in 15 minutes and can only be used once.";
const IGNORE_FOOTER = "If you didn't request this email, you can safely ignore it. Nothing will change.";

const TEMPLATES: Record<AuthEmailKind, Template> = {
  ADMIN_SIGN_IN: {
    subject: "Your Casual Padel admin sign-in link",
    link: buildAdminSignInUrl,
    content: (url) => ({
      preheader: "Use this secure link to sign in to platform administration.",
      heading: "Sign in to platform admin",
      paragraphs: ["Use the button below to sign in to Casual Padel platform administration."],
      cta: { label: "Sign in to admin", url },
      note: EXPIRY_NOTE,
      footer: IGNORE_FOOTER
    })
  },
  SIGN_IN: {
    subject: "Your Casual Padel sign-in link",
    link: buildMagicLinkUrl,
    content: (url) => ({
      preheader: "Your secure sign-in link is inside.",
      heading: "Sign in to Casual Padel",
      paragraphs: ["Tap the button below to sign in. No password needed."],
      cta: { label: "Sign in", url },
      note: EXPIRY_NOTE,
      footer: IGNORE_FOOTER
    })
  },
  VERIFY: {
    subject: "Verify your Casual Padel email",
    link: buildMagicLinkUrl,
    content: (url) => ({
      preheader: "Confirm this is your email address to finish setting up.",
      heading: "Verify your email",
      paragraphs: ["Confirm this is your email address to finish setting up your Casual Padel account."],
      cta: { label: "Verify email", url },
      note: EXPIRY_NOTE,
      footer: IGNORE_FOOTER
    })
  },
  ATTACH: {
    subject: "Confirm your Casual Padel email",
    link: buildMagicLinkUrl,
    content: (url) => ({
      preheader: "Confirm your email to keep your tournaments.",
      heading: "Keep your tournaments",
      paragraphs: [
        "Confirm your email to save your tournaments to your account so you can access them on any device."
      ],
      cta: { label: "Confirm email", url },
      note: EXPIRY_NOTE,
      footer: IGNORE_FOOTER
    })
  },
  PASSWORD_RESET: {
    subject: "Reset your Casual Padel password",
    link: buildPasswordResetUrl,
    content: (url) => ({
      preheader: "Use this link to choose a new password.",
      heading: "Reset your password",
      paragraphs: ["We received a request to reset your password. Use the button below to choose a new one."],
      cta: { label: "Reset password", url },
      note: EXPIRY_NOTE,
      footer: "If you didn't ask to reset your password, you can ignore this email. Your password won't change."
    })
  }
};

export function buildAuthEmail(kind: AuthEmailKind, rawToken: string) {
  const template = TEMPLATES[kind];
  return { subject: template.subject, ...renderEmail(template.content(template.link(rawToken))) };
}

export class MailAuthNotifier implements AuthNotifier {
  async send(kind: AuthEmailKind, to: string, rawToken: string): Promise<void> {
    await getMailer().send({ to, ...buildAuthEmail(kind, rawToken) });
  }
}
