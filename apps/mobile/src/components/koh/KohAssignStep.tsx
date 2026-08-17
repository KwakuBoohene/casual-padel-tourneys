import { Text, View } from "react-native";

import type { KohDraftCourt } from "../../types/koh/create";
import { balanceHintForCounts, canAddPair } from "../../utilities/koh/createDraft";
import { WizardChrome } from "../organizer/create/WizardChrome";
import { spacing } from "../../theme";
import { useTheme } from "../../theme/ThemeProvider";

import { KohAssignActions, KohCourtPager } from "./KohAssignChrome";
import { KohUnitRow } from "./KohUnitRow";

interface KohAssignStepProps {
  stepIndex: number;
  stepCount: number;
  courtUnits: KohDraftCourt[];
  assignCourtIndex: number;
  selectedUnitId: string | null;
  onSelectCourt: (index: number) => void;
  onSelectUnit: (unitId: string) => void;
  onAddPair: () => void;
  onRandomize: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onBack: () => void;
  onNext: () => void;
}

export function KohAssignStep(props: KohAssignStepProps) {
  const { colors } = useTheme();
  const court = props.courtUnits[props.assignCourtIndex];
  const counts = props.courtUnits.map((entry) => entry.units.length);
  const balance = balanceHintForCounts(counts);

  return (
    <WizardChrome
      modeLabel="King of the Court"
      stepIndex={props.stepIndex}
      stepCount={props.stepCount}
      title="Assign teams"
      subtitle="Doubles only. King · Next · Wait."
      primaryLabel="Review & start"
      primaryDisabled={!court || court.units.length < 2}
      onPrimary={props.onNext}
      onBack={props.onBack}
      footerExtra={
        <KohAssignActions
          canAdd={court ? canAddPair(court) : false}
          onAddPair={props.onAddPair}
          onRandomize={props.onRandomize}
          onMoveUp={props.onMoveUp}
          onMoveDown={props.onMoveDown}
        />
      }
    >
      <KohCourtPager
        courtUnits={props.courtUnits}
        assignCourtIndex={props.assignCourtIndex}
        onSelectCourt={props.onSelectCourt}
      />
      <Text style={{ color: colors.muted, fontSize: 13 }}>
        {balance ?? `Balance ${counts.join(" · ")}`}
      </Text>
      <View style={{ gap: spacing.sm }}>
        {(court?.units ?? []).map((unit, index) => (
          <KohUnitRow
            key={unit.id}
            unit={unit}
            index={index}
            selected={props.selectedUnitId === unit.id}
            onSelect={() => props.onSelectUnit(unit.id)}
          />
        ))}
      </View>
    </WizardChrome>
  );
}
