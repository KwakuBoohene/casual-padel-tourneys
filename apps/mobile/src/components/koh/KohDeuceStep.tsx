import type { DeuceMode } from "@padel/shared";

import { WizardChrome } from "../organizer/create/WizardChrome";
import { DeuceModeFields } from "../organizer/create/DeuceModeFields";

interface KohDeuceStepProps {
  stepIndex: number;
  stepCount: number;
  deuceMode: DeuceMode;
  onChangeDeuce: (value: DeuceMode) => void;
  onBack: () => void;
  onNext: () => void;
}

export function KohDeuceStep(props: KohDeuceStepProps) {
  return (
    <WizardChrome
      modeLabel="King of the Court"
      stepIndex={props.stepIndex}
      stepCount={props.stepCount}
      title="Deuce system"
      subtitle="How each game is decided when it reaches deuce (40-40)."
      primaryLabel="Next"
      onPrimary={props.onNext}
      onBack={props.onBack}
    >
      <DeuceModeFields value={props.deuceMode} onChange={props.onChangeDeuce} />
    </WizardChrome>
  );
}
