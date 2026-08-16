import type { AuthModuleDeps } from "../application/ports.js";
import { GoogleIdTokenVerifier } from "../infrastructure/GoogleIdTokenVerifier.js";
import { JwtTokenIssuer } from "../infrastructure/JwtAuthTokens.js";
import { MailAuthNotifier } from "../infrastructure/MailAuthNotifier.js";
import {
  MemoryLoginAttemptStore,
  MemoryResetTicketStore
} from "../infrastructure/MemoryPasswordSessions.js";
import { OpaquePasswordProtocol } from "../infrastructure/OpaquePasswordProtocol.js";
import { PrismaAuthUserRepository } from "../infrastructure/PrismaAuthUserRepository.js";
import { PrismaMagicTokenStore } from "../infrastructure/PrismaMagicTokenStore.js";

export function createAuthDeps(): AuthModuleDeps {
  return {
    users: new PrismaAuthUserRepository(),
    magicTokens: new PrismaMagicTokenStore(),
    notifier: new MailAuthNotifier(),
    tokens: new JwtTokenIssuer(),
    google: new GoogleIdTokenVerifier(),
    password: new OpaquePasswordProtocol(),
    loginAttempts: new MemoryLoginAttemptStore(),
    resetTickets: new MemoryResetTicketStore()
  };
}
