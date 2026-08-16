import { useCallback, useEffect, useState } from "react";
import { router, useLocalSearchParams } from "expo-router";

import { consumeMagicLink } from "../../../src/api/auth";
import { MagicLinkConsumeScreen } from "../../../src/screens/MagicLinkConsumeScreen";
import { useAuthSessionContext } from "../../../src/providers/AuthSessionProvider";

export default function MagicLinkRoute() {
  const auth = useAuthSessionContext();
  const params = useLocalSearchParams<{ token?: string | string[] }>();
  const tokenParam = params.token;
  const token = Array.isArray(tokenParam) ? tokenParam[0] : tokenParam;

  const [status, setStatus] = useState<"working" | "error">("working");
  const [message, setMessage] = useState<string | undefined>();

  const consume = useCallback(
    async (value: string) => {
      setStatus("working");
      setMessage(undefined);
      try {
        const session = await consumeMagicLink(value);
        auth.clearEmailVerifyRequired();
        await auth.handleSignedIn(session);
        router.replace("/");
      } catch (error) {
        setStatus("error");
        setMessage(error instanceof Error ? error.message : "Invalid or expired sign-in link.");
      }
    },
    [auth]
  );

  useEffect(() => {
    if (!token?.trim()) {
      setStatus("error");
      setMessage("Missing sign-in token.");
      return;
    }
    void consume(token.trim());
  }, [token, consume]);

  return (
    <MagicLinkConsumeScreen
      status={status}
      message={message}
      onRetry={token ? () => void consume(token.trim()) : undefined}
      onDismiss={() => router.replace("/sign-in")}
    />
  );
}
