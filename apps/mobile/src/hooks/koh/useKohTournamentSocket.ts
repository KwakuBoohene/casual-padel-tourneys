import { useEffect, useRef } from "react";

import type { KohTournamentHub } from "../../types/koh/create";

const apiBaseUrl = process.env.EXPO_PUBLIC_API_BASE_URL ?? "http://localhost:3001";

export function useKohTournamentSocket(params: {
  tournamentId: string | null;
  publicToken: string | null;
  enabled: boolean;
  onHub: (hub: KohTournamentHub) => void;
}): void {
  const onHubRef = useRef(params.onHub);
  onHubRef.current = params.onHub;

  useEffect(() => {
    if (!params.enabled || !params.tournamentId || !params.publicToken) {
      return;
    }
    const wsBase = apiBaseUrl.replace(/^http/, "ws");
    const socket = new WebSocket(
      `${wsBase}/ws/tournaments/${params.tournamentId}?token=${encodeURIComponent(params.publicToken)}`
    );

    socket.onmessage = (event) => {
      try {
        const parsed = JSON.parse(String(event.data)) as {
          payload?: { type?: string; payload?: KohTournamentHub };
        };
        const inner = parsed?.payload?.payload;
        if (inner && typeof inner === "object" && "courts" in inner && "config" in inner) {
          onHubRef.current(inner);
        }
      } catch {
        // ignore malformed frames
      }
    };

    return () => {
      socket.close();
    };
  }, [params.enabled, params.tournamentId, params.publicToken]);
}
