import type { KohMatchFormatChoice } from "../../types/koh/create";
import { ScoringModeOptionCard } from "../organizer/create/ScoringModeOptionCard";
import { WizardChrome } from "../organizer/create/WizardChrome";

interface KohFormatStepProps {
  stepIndex: number;
  stepCount: number;
  matchFormat: KohMatchFormatChoice;
  onChangeFormat: (value: KohMatchFormatChoice) => void;
  onBack: () => void;
  onNext: () => void;
}

const OPTIONS: { value: KohMatchFormatChoice; title: string; detail: string }[] = [
  { value: "FULL_SET", title: "Full set to 6", detail: "Classic set · win by 2 or tiebreak" },
  { value: "BO3_GAMES", title: "Best of 3", detail: "First to 2 games wins the match" },
  { value: "BO5_GAMES", title: "Best of 5", detail: "First to 3 games wins the match" }
];

export function KohFormatStep(props: KohFormatStepProps) {
  return (
    <WizardChrome
      modeLabel="King of the Hill"
      stepIndex={props.stepIndex}
      stepCount={props.stepCount}
      title="Match format"
      subtitle="Winner stays until they lose. On loss, teams swap for the new king."
      primaryLabel="Next"
      onPrimary={props.onNext}
      onBack={props.onBack}
    >
      {OPTIONS.map((option) => (
        <ScoringModeOptionCard
          key={option.value}
          title={option.title}
          lines={[option.detail]}
          selected={props.matchFormat === option.value}
          onPress={() => props.onChangeFormat(option.value)}
        />
      ))}
    </WizardChrome>
  );
}
