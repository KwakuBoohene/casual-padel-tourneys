import type { KohDeuceMode } from "../../types/koh/create";
import { ScoringModeOptionCard } from "../organizer/create/ScoringModeOptionCard";
import { WizardChrome } from "../organizer/create/WizardChrome";

interface KohDeuceStepProps {
  stepIndex: number;
  stepCount: number;
  deuceMode: KohDeuceMode;
  onChangeDeuce: (value: KohDeuceMode) => void;
  onBack: () => void;
  onNext: () => void;
}

const OPTIONS: { value: KohDeuceMode; title: string; detail: string }[] = [
  { value: "ADVANTAGE", title: "Advantage", detail: "Play until win by 2 points" },
  { value: "GOLDEN", title: "Golden point", detail: "No-ad · deciding point at deuce" },
  { value: "STAR", title: "Star point", detail: "Two deuces, then a final deciding point" }
];

export function KohDeuceStep(props: KohDeuceStepProps) {
  return (
    <WizardChrome
      modeLabel="King of the Hill"
      stepIndex={props.stepIndex}
      stepCount={props.stepCount}
      title="Deuce system"
      subtitle="How each game is decided when it reaches deuce (40-40)."
      primaryLabel="Next"
      onPrimary={props.onNext}
      onBack={props.onBack}
    >
      {OPTIONS.map((option) => (
        <ScoringModeOptionCard
          key={option.value}
          title={option.title}
          lines={[option.detail]}
          selected={props.deuceMode === option.value}
          onPress={() => props.onChangeDeuce(option.value)}
        />
      ))}
    </WizardChrome>
  );
}
