import { getMailer } from "../../../lib/mail/index.js";
import type { AuthEmailKind, AuthNotifier } from "../application/ports.js";
import { buildMagicLinkUrl, buildPasswordResetUrl } from "./authLinks.js";

type Template = {
  subject: string;
  lead: string;
  cta: string;
  link: (rawToken: string) => string;
};

const TEMPLATES: Record<AuthEmailKind, Template> = {
  SIGN_IN: {
    subject: "Your Casual Padel sign-in link",
    lead: "Sign in with this link (expires in 15 minutes):",
    cta: "Open sign-in link",
    link: buildMagicLinkUrl
  },
  VERIFY: {
    subject: "Verify your Casual Padel email",
    lead: "Verify your email (expires in 15 minutes):",
    cta: "Verify email",
    link: buildMagicLinkUrl
  },
  ATTACH: {
    subject: "Confirm your Casual Padel email",
    lead: "Confirm your email to keep your tournaments (expires in 15 minutes):",
    cta: "Confirm email",
    link: buildMagicLinkUrl
  },
  PASSWORD_RESET: {
    subject: "Reset your Casual Padel password",
    lead: "Reset your password with this link (expires in 15 minutes):",
    cta: "Reset password",
    link: buildPasswordResetUrl
  }
};

export class MailAuthNotifier implements AuthNotifier {
  async send(kind: AuthEmailKind, to: string, rawToken: string): Promise<void> {
    const template = TEMPLATES[kind];
    const link = template.link(rawToken);
    await getMailer().send({
      to,
      subject: template.subject,
      text: `${template.lead}\n\n${link}\n`,
      html: `<p>${template.lead}</p><p><a href="${link}">${template.cta}</a></p>`
    });
  }
}
