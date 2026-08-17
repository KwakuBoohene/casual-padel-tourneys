import { useQuery } from "@tanstack/react-query";

import { apiGet } from "../../api/client";
import { tournamentQueryKeys } from "../../utilities/organizer/tournamentQueryKeys";

export function usePlayerNameSuggestions(enabled = true): string[] {
  const query = useQuery({
    queryKey: tournamentQueryKeys.playerSuggestions(),
    queryFn: async () => {
      const payload = await apiGet<{ names: string[] }>("/players/suggestions");
      return payload.names ?? [];
    },
    staleTime: 60_000,
    enabled
  });
  return query.data ?? [];
}
