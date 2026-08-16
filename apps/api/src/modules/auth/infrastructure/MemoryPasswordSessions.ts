import {
  storePasswordLoginAttempt,
  takePasswordLoginAttempt
} from "../../../lib/passwordLoginAttempts.js";
import {
  peekPasswordResetTicket,
  storePasswordResetTicket,
  takePasswordResetTicket
} from "../../../lib/passwordResetTickets.js";
import type { LoginAttemptStore, ResetTicketStore } from "../application/passwordPorts.js";

/**
 * In-process TTL maps. Fine for a single API node; swapping in Redis means
 * replacing these adapters, not the use-cases.
 */
export class MemoryLoginAttemptStore implements LoginAttemptStore {
  store(input: { serverLoginState: string; userId: string | null }): string {
    return storePasswordLoginAttempt(input);
  }

  take(loginId: string): { serverLoginState: string; userId: string | null } | null {
    return takePasswordLoginAttempt(loginId);
  }
}

export class MemoryResetTicketStore implements ResetTicketStore {
  store(userId: string): string {
    return storePasswordResetTicket(userId);
  }

  peek(resetTicket: string): { userId: string } | null {
    return peekPasswordResetTicket(resetTicket);
  }

  take(resetTicket: string): { userId: string } | null {
    return takePasswordResetTicket(resetTicket);
  }
}
