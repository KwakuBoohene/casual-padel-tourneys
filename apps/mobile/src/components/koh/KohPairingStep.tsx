import { ScoringModeOptionCard } from "../organizer/create/ScoringModeOptionCard";
import { WizardChrome } from "../organizer/create/WizardChrome";

interface KohPairingStepProps {
  stepIndex: number;
  stepCount: number;
  onBack: () => void;
  onNext: () => void;
  onRoundRobinInfo: () => void;
}

export function KohPairingStep(props: KohPairingStepProps) {
  return (
    <WizardChrome
      modeLabel="King of the Court"
      stepIndex={props.stepIndex}
      stepCount={props.stepCount}
      title="How we pair"
      subtitle="Winner-stays Court nights. You still use Regular scoring on court."
      primaryLabel="Next"
      onPrimary={props.onNext}
      onBack={props.onBack}
    >
      <ScoringModeOptionCard
        title="Winner-stays"
        lines={["King holds court until loss", "Challenger queue is FIFO"]}
        selected
        onPress={() => undefined}
      />
      {/* Round-robin pairs — hide until RR epic is ready.
      <ScoringModeOptionCard
        title="Round-robin pairs"
        lines={["Coming next — mix partners each round"]}
        selected={false}
        onPress={props.onRoundRobinInfo}
      />
      */}
    </WizardChrome>
  );
}
