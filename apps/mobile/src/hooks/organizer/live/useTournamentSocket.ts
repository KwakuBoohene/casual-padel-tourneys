import { useEffect, useRef } from "react";

import type { LiveTournamentState } from "../../../types/organizer/tournament";
import { parseTournamentSocketMessage } from "../../../utilities/realtime/tournamentSocketMessage";
import { buildTournamentWsUrl } from "../../../utilities/realtime/tournamentWsUrl";

const MAX_BACKOFF_MS = 30_000;

export function useTournamentSocket(params: {
  tournamentId: string | null;
  publicToken: string | null;
  enabled: boolean;
  onTournament: (data: LiveTournamentState) => void;
  onDeleted?: (tournamentId: string) => void;
}): void {
  const onTournamentRef = useRef(params.onTournament);
  const onDeletedRef = useRef(params.onDeleted);
  onTournamentRef.current = params.onTournament;
  onDeletedRef.current = params.onDeleted;

  useEffect(() => {
    if (!params.enabled || !params.tournamentId || !params.publicToken) {
      return;
    }

    const tournamentId = params.tournamentId;
    const url = buildTournamentWsUrl(tournamentId, params.publicToken);
    let closed = false;
    let attempt = 0;
    let socket: WebSocket | null = null;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;

    const clearTimer = () => {
      if (reconnectTimer) {
        clearTimeout(reconnectTimer);
        reconnectTimer = null;
      }
    };

    const connect = () => {
      if (closed) return;
      clearTimer();
      socket = new WebSocket(url);

      socket.onopen = () => {
        attempt = 0;
      };

      socket.onmessage = (event) => {
        const parsed = parseTournamentSocketMessage(String(event.data));
        if (parsed.kind === "tournament") {
          onTournamentRef.current(parsed.data);
          return;
        }
        if (parsed.kind === "deleted") {
          onDeletedRef.current?.(parsed.tournamentId);
        }
      };

      socket.onclose = () => {
        socket = null;
        if (closed) return;
        const delay = Math.min(MAX_BACKOFF_MS, 1000 * 2 ** attempt);
        attempt += 1;
        reconnectTimer = setTimeout(connect, delay);
      };

      socket.onerror = () => {
        // onclose follows; reconnect handled there
      };
    };

    connect();

    return () => {
      closed = true;
      clearTimer();
      socket?.close();
      socket = null;
    };
  }, [params.enabled, params.tournamentId, params.publicToken]);
}
