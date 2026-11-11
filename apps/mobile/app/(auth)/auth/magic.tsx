import { destinationAfterSignIn } from "../../../src/api/pendingOrganizerInvite";
import { useCallback, useEffect, useState } from "react";
import { router, useLocalSearchParams } from "expo-router";

import { consumeMagicLink } from "../../../src/api/auth";
import { MagicLinkConsumeScreen } from "../../../src/screens/MagicLinkConsumeScreen";
import { useAuthSessionContext } from "../../../src/providers/AuthSessionProvider";

export default function MagicLinkRoute() {
  const { clearEmailVerifyRequired, handleSignedIn } = useAuthSessionContext();
  const params = useLocalSearchParams<{ token?: string | string[] }>();
  const tokenParam = params.token;
  const token = Array.isArray(tokenParam) ? tokenParam[0] : tokenParam;

  const [status, setStatus] = useState<"working" | "error">("working");
  const [message, setMessage] = useState<string | undefined>();
  const missingToken = !token?.trim();

  const redeem = useCallback(
    (value: string) =>
      consumeMagicLink(value)
        .then(async (session) => {
          clearEmailVerifyRequired();
          await handleSignedIn(session);
          router.replace(await destinationAfterSignIn());
        })
        .catch((error: unknown) => {
          setStatus("error");
          setMessage(error instanceof Error ? error.message : "Invalid or expired sign-in link.");
        }),
    [clearEmailVerifyRequired, handleSignedIn]
  );

  useEffect(() => {
    if (!token || missingToken) return;
    void redeem(token.trim());
  }, [token, missingToken, redeem]);

  const retry = (value: string) => {
    setStatus("working");
    setMessage(undefined);
    void redeem(value.trim());
  };

  return (
    <MagicLinkConsumeScreen
      status={missingToken ? "error" : status}
      message={missingToken ? "Missing sign-in token." : message}
      onRetry={token ? () => retry(token) : undefined}
      onDismiss={() => router.replace("/sign-in")}
    />
  );
}
