import type { useKohCreateWizard } from "../../hooks/koh/useKohCreateWizard";

import { KohAssignStep } from "./KohAssignStep";
import { KohCourtsStep } from "./KohCourtsStep";
import { KohDeuceStep } from "./KohDeuceStep";
import { KohFormatStep } from "./KohFormatStep";
import { KohNameStep } from "./KohNameStep";
import { KohPairingStep } from "./KohPairingStep";
import { KohPromotionStep } from "./KohPromotionStep";
import { KohReviewStep } from "./KohReviewStep";

type Wizard = ReturnType<typeof useKohCreateWizard>;

interface KohCreateStepsProps {
  wizard: Wizard;
}

export function KohCreateSteps(props: KohCreateStepsProps) {
  const { wizard } = props;
  const { draft, setDraft, stepIndex, stepCount } = wizard;

  if (wizard.step === "NAME") {
    return (
      <KohNameStep
        stepIndex={stepIndex}
        stepCount={stepCount}
        name={draft.name}
        canContinue={wizard.canContinueFromName}
        contributeToCareerLeaderboard={draft.contributeToCareerLeaderboard}
        onChangeName={(name) => setDraft((prev) => ({ ...prev, name }))}
        onChangeContributeToCareerLeaderboard={(contributeToCareerLeaderboard) =>
          setDraft((prev) => ({ ...prev, contributeToCareerLeaderboard }))
        }
        onBack={wizard.goBack}
        onNext={wizard.goNext}
      />
    );
  }
  if (wizard.step === "PAIRING") {
    return (
      <KohPairingStep
        stepIndex={stepIndex}
        stepCount={stepCount}
        onBack={wizard.goBack}
        onNext={wizard.goNext}
        onRoundRobinInfo={() => wizard.setShowRrInfo(true)}
      />
    );
  }
  if (wizard.step === "FORMAT") {
    return (
      <KohFormatStep
        stepIndex={stepIndex}
        stepCount={stepCount}
        matchFormat={draft.matchFormat}
        onChangeFormat={(matchFormat) => setDraft((prev) => ({ ...prev, matchFormat }))}
        onBack={wizard.goBack}
        onNext={wizard.goNext}
      />
    );
  }
  if (wizard.step === "DEUCE") {
    return (
      <KohDeuceStep
        stepIndex={stepIndex}
        stepCount={stepCount}
        deuceMode={draft.deuceMode}
        onChangeDeuce={(deuceMode) => setDraft((prev) => ({ ...prev, deuceMode }))}
        onBack={wizard.goBack}
        onNext={wizard.goNext}
      />
    );
  }
  if (wizard.step === "COURTS") {
    return (
      <KohCourtsStep
        stepIndex={stepIndex}
        stepCount={stepCount}
        courts={draft.courts}
        onChangeCourts={wizard.setCourts}
        onBack={wizard.goBack}
        onNext={wizard.goNext}
      />
    );
  }
  if (wizard.step === "PROMOTION") {
    return (
      <KohPromotionStep
        stepIndex={stepIndex}
        stepCount={stepCount}
        promoRules={draft.promoRules}
        onChangeRules={(promoRules) => setDraft((prev) => ({ ...prev, promoRules }))}
        onBack={wizard.goBack}
        onNext={wizard.goNext}
      />
    );
  }
  if (wizard.step === "ASSIGN") {
    return (
      <KohAssignStep
        stepIndex={stepIndex}
        stepCount={stepCount}
        courtUnits={draft.courtUnits}
        assignCourtIndex={draft.assignCourtIndex}
        selectedUnitId={draft.selectedUnitId}
        onSelectCourt={(assignCourtIndex) =>
          setDraft((prev) => ({ ...prev, assignCourtIndex, selectedUnitId: null }))
        }
        onSelectUnit={(selectedUnitId) => setDraft((prev) => ({ ...prev, selectedUnitId }))}
        onAddPair={wizard.openAddPair}
        onRandomize={wizard.randomizeActiveCourt}
        onMoveUp={() => wizard.moveSelected(-1)}
        onMoveDown={() => wizard.moveSelected(1)}
        onBack={wizard.goBack}
        onNext={wizard.goNext}
      />
    );
  }
  return (
    <KohReviewStep
      stepIndex={stepIndex}
      stepCount={stepCount}
      draft={draft}
      canStart={wizard.canStart}
      submitting={wizard.submitting}
      onBack={wizard.goBack}
      onStart={() => void wizard.startTournament()}
    />
  );
}
