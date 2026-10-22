import { useSubmission } from "../useSubmission";

import { apiPost } from "../../api/client";

export function useCareerLeaderboardToggle<T>(params: {
  tournamentId: string | undefined;
  setErrorText: (value: string) => void;
  apply: (data: T) => void;
}): {
  careerSaving: boolean;
  setContributeToCareerLeaderboard: (value: boolean) => Promise<void>;
} {
  const { saving: careerSaving, run } = useSubmission();

  const setContributeToCareerLeaderboard = (contributeToCareerLeaderboard: boolean) =>
    run(async () => {
      if (!params.tournamentId) return;
      try {
        params.setErrorText("");
        const response = await apiPost<{ data: T }>("/tournaments/career-leaderboard", {
          tournamentId: params.tournamentId,
          contributeToCareerLeaderboard
        });
        params.apply(response.data);
      } catch (error) {
        params.setErrorText((error as Error).message);
      }
    });

  return { careerSaving, setContributeToCareerLeaderboard };
}
