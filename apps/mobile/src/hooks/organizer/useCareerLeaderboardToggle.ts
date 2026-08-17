import { useState } from "react";

import { apiPost } from "../../api/client";

export function useCareerLeaderboardToggle<T>(params: {
  tournamentId: string | undefined;
  setErrorText: (value: string) => void;
  apply: (data: T) => void;
}): {
  careerSaving: boolean;
  setContributeToCareerLeaderboard: (value: boolean) => Promise<void>;
} {
  const [careerSaving, setCareerSaving] = useState(false);

  const setContributeToCareerLeaderboard = async (contributeToCareerLeaderboard: boolean) => {
    if (!params.tournamentId) return;
    try {
      params.setErrorText("");
      setCareerSaving(true);
      const response = await apiPost<{ data: T }>("/tournaments/career-leaderboard", {
        tournamentId: params.tournamentId,
        contributeToCareerLeaderboard
      });
      params.apply(response.data);
    } catch (error) {
      params.setErrorText((error as Error).message);
    } finally {
      setCareerSaving(false);
    }
  };

  return { careerSaving, setContributeToCareerLeaderboard };
}
