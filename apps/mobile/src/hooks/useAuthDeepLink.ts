import * as Linking from "expo-linking";
import { useEffect, useRef } from "react";

import { parseAuthDeepLink } from "../api/authDeepLink";
import { logger } from "../logger";

interface UseAuthDeepLinkParams {
  onMagicToken: (token: string) => void;
  onResetToken: (token: string) => void;
}

export function useAuthDeepLink(params: UseAuthDeepLinkParams): void {
  const magicRef = useRef(params.onMagicToken);
  const resetRef = useRef(params.onResetToken);
  magicRef.current = params.onMagicToken;
  resetRef.current = params.onResetToken;

  useEffect(() => {
    const handleUrl = (url: string | null) => {
      if (!url) {
        return;
      }
      const link = parseAuthDeepLink(url);
      if (!link) {
        return;
      }
      logger.info("useAuthDeepLink: received", { kind: link.kind });
      if (link.kind === "magic") {
        magicRef.current(link.token);
      } else {
        resetRef.current(link.token);
      }
    };

    void Linking.getInitialURL().then(handleUrl);
    const subscription = Linking.addEventListener("url", (event) => handleUrl(event.url));
    return () => subscription.remove();
  }, []);
}
