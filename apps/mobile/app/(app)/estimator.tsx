import { router } from "expo-router";

import { GameEstimatorView } from "../../src/components/organizer/estimator/GameEstimatorView";
import { useOrganizerSession } from "../../src/providers/OrganizerSessionProvider";

export default function EstimatorRoute() {
  const org = useOrganizerSession();

  return (
    <GameEstimatorView
      mode={org.estimatorMode}
      variant={org.estimatorVariant}
      schedulingMode={org.effectiveEstimatorSchedulingMode}
      scoringMode={org.estimatorScoringMode}
      setsToWin={org.estimatorSetsToWin}
      usersText={org.estimatorUsersText}
      courtsText={org.estimatorCourtsText}
      pointsText={org.estimatorPointsText}
      targetGamesText={org.estimatorTargetGamesText}
      tournamentTimeText={org.estimatorTournamentTimeText}
      estimate={org.estimator}
      onChangeMode={org.setEstimatorMode}
      onChangeVariant={org.setEstimatorVariant}
      onChangeSchedulingMode={org.setEstimatorSchedulingMode}
      onChangeScoringMode={org.setEstimatorScoringMode}
      onChangeSetsToWin={org.setEstimatorSetsToWin}
      onChangeUsers={org.onChangeEstimatorUsersValue}
      onChangeCourts={org.onChangeEstimatorCourtsValue}
      onChangePoints={org.onChangeEstimatorPointsValue}
      onChangeTargetGames={org.onChangeEstimatorTargetGamesValue}
      onChangeTournamentTime={org.onChangeEstimatorTournamentTimeValue}
      onBack={() => router.replace("/tournaments")}
      onUseInNewTournament={() => {
        org.beginCreate({
          kind: "estimator",
          draft: {
            mode: org.estimatorMode,
            variant: org.estimatorVariant,
            schedulingMode: org.effectiveEstimatorSchedulingMode,
            courtsText: org.estimatorCourtsText,
            pointsText: org.estimatorPointsText,
            targetGamesText: org.estimatorTargetGamesText,
            tournamentTimeText: org.estimatorTournamentTimeText,
            scoringMode: org.estimatorScoringMode,
            setsToWin: org.estimatorSetsToWin
          }
        });
      }}
    />
  );
}
