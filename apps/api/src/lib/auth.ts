/**
 * Thin re-export shim. Auth lives in `modules/auth`; the tournament, KOH and
 * organizer-player modules keep importing the preHandlers from here so the seam
 * stays one import path.
 */
export { toAuthUser, type AuthTokenSource } from "../modules/auth/domain/authUser.js";
export { signAuthToken } from "../modules/auth/infrastructure/JwtAuthTokens.js";
export {
  requireAuth,
  requireOrganizerAccess,
  requireVerifiedEmail,
  tryAuthUser
} from "../modules/auth/http/preHandlers.js";
