export const tournamentQueryKeys = {
  all: ["tournaments"] as const,
  list: () => [...tournamentQueryKeys.all, "list"] as const,
  detail: (id: string) => [...tournamentQueryKeys.all, "detail", id] as const,
  playerSuggestions: () => [...tournamentQueryKeys.all, "player-suggestions"] as const
};
