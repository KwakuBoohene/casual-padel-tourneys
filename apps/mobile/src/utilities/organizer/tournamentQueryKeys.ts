import { getOrganizerScope } from "../../api/organizerContext";
export const tournamentQueryKeys = {
  all: ["tournaments"] as const,
  list: () => [...tournamentQueryKeys.all, ...getOrganizerScope(), "list"] as const,
  detail: (id: string) => [...tournamentQueryKeys.all, ...getOrganizerScope(), "detail", id] as const,
  playerSuggestions: () => [...tournamentQueryKeys.all, ...getOrganizerScope(), "player-suggestions"] as const
};
