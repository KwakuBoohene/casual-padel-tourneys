import { useEffect } from "react";

import { setSessionExpiryHandler } from "../../api/sessionExpiry";

/** Bridges the API layer's module-level 401 signal to React. Mount once, above every route. */
export function useSessionExpiryWatcher(onExpired: () => void): void {
  useEffect(() => {
    setSessionExpiryHandler(onExpired);
    return () => setSessionExpiryHandler(null);
  }, [onExpired]);
}
