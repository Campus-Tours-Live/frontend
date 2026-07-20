/**
 * Client auth layer (CLIENT-ONLY). The re-auth gate pulls in `client-only` as a
 * side-effect, so importing this barrel from a Server Component fails the build.
 *
 * The server-safe `sanitizeReturnTo` is intentionally NOT re-exported here —
 * import it directly from "@/lib/auth/returnTo" (works in both server and client)
 * so server modules never get tainted via this barrel.
 */
import "client-only";

export {
  subscribeAuthGate,
  requireAuth,
  completeAuth,
  advanceAuthEpoch,
  cancelAuth,
  resetAuthGate,
  AuthCancelledError,
  SIGN_IN_AGAIN_MESSAGE,
  isAuthCancelled,
} from "./authGate";
export {
  subscribeAuthNotice,
  notifyAuthNotice,
  clearAuthNotice,
  getAuthNotice,
  type AuthNoticeState,
  type AuthNotice,
} from "./authNotice";
