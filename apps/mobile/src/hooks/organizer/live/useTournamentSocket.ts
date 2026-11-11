import { rememberTournamentVersion } from "../../../api/organizerContext";
import { useEffect, useEffectEvent } from "react";

import type { LiveTournamentState } from "../../../types/organizer/tournament";
import { parseTournamentSocketMessage } from "../../../utilities/realtime/tournamentSocketMessage";
import { buildTournamentWsUrl } from "../../../utilities/realtime/tournamentWsUrl";

const MAX_BACKOFF_MS = 30_000;
/** The hub rejects a bad share token or a missing tournament; reconnecting cannot fix either. */
const TERMINAL_CLOSE_CODES = new Set([4401, 4404]);

export function useTournamentSocket(params: {
  tournamentId: string | null;
  publicToken: string | null;
  enabled: boolean;
  onTournament: (data: LiveTournamentState) => void;
  onDeleted?: (tournamentId: string) => void;
}): void {
  // Effect events always see the latest callbacks without reconnecting the socket.
  const onTournament = useEffectEvent((data: LiveTournamentState) => params.onTournament(data));
  const onDeleted = useEffectEvent((tournamentId: string) => params.onDeleted?.(tournamentId));

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
          rememberTournamentVersion(parsed.data);
          onTournament(parsed.data);
          return;
        }
        if (parsed.kind === "deleted") {
          onDeleted(parsed.tournamentId);
        }
      };

      socket.onclose = (event) => {
        socket = null;
        if (closed) return;
        if (TERMINAL_CLOSE_CODES.has(event.code)) {
          closed = true;
          return;
        }
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
