import { PrismaAuthUserRepository } from "../../auth/infrastructure/PrismaAuthUserRepository.js";
import { PrismaMagicTokenStore } from "../../auth/infrastructure/PrismaMagicTokenStore.js";
import { MailAuthNotifier } from "../../auth/infrastructure/MailAuthNotifier.js";
import type { AdminSignInServices } from "../application/requestSignIn.js";

export class PrismaAdminSignInServices implements AdminSignInServices {
  private users = new PrismaAuthUserRepository();
  private tokens = new PrismaMagicTokenStore();
  private notifier = new MailAuthNotifier();
  findUser(email: string) {
    return this.users.findByEmail(email);
  }
  issueToken(userId: string, expiresAt: Date) {
    return this.tokens.issue({ userId, purpose: "LOGIN", expiresAt });
  }
  sendLink(email: string, token: string) {
    return this.notifier.send("ADMIN_SIGN_IN", email, token);
  }
}
