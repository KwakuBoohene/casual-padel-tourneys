export interface AuthUser {
  id: string;
  email: string;
  name?: string;
  isGuest?: boolean;
  /** True once emailVerifiedAt is set (or Google-proven). Guests ignore the verify gate via isGuest. */
  emailVerified?: boolean;
  /** Epoch ms deadline to verify; omitted when already verified or not applicable. */
  verifyBy?: number;
}
