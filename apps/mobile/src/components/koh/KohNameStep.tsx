import { Text, TextInput, View } from "react-native";

import { WizardChrome } from "../organizer/create/WizardChrome";
import { CareerOptInRow } from "../organizer/create/CareerOptInRow";
import { radius, spacing } from "../../theme";
import { useTheme } from "../../theme/ThemeProvider";
import { tournamentNamePlaceholder } from "../../utilities/organizer/tournamentNamePlaceholder";

interface KohNameStepProps {
  stepIndex: number;
  stepCount: number;
  name: string;
  canContinue: boolean;
  contributeToCareerLeaderboard: boolean;
  onChangeName: (value: string) => void;
  onChangeContributeToCareerLeaderboard: (value: boolean) => void;
  onBack: () => void;
  onNext: () => void;
}

export function KohNameStep(props: KohNameStepProps) {
  const { colors } = useTheme();
  const placeholder = tournamentNamePlaceholder(new Date(), "KING_OF_THE_COURT");

  return (
    <WizardChrome
      modeLabel="King of the Court"
      stepIndex={props.stepIndex}
      stepCount={props.stepCount}
      title="Name your tournament"
      primaryLabel="Next"
      primaryDisabled={!props.canContinue}
      onPrimary={props.onNext}
      onBack={props.onBack}
    >
      <View
        style={{
          borderRadius: radius.lg,
          borderWidth: 2,
          borderColor: colors.primary,
          backgroundColor: colors.surface,
          paddingHorizontal: spacing.md,
          paddingVertical: spacing.md
        }}
      >
        <Text style={{ fontSize: 12, color: colors.muted }}>Tournament name</Text>
        <TextInput
          value={props.name}
          onChangeText={props.onChangeName}
          placeholder={placeholder}
          placeholderTextColor={colors.muted}
          style={{ color: colors.text, fontSize: 18, fontWeight: "600", paddingVertical: spacing.xs }}
        />
      </View>
      <CareerOptInRow
        value={props.contributeToCareerLeaderboard}
        onChange={props.onChangeContributeToCareerLeaderboard}
      />
    </WizardChrome>
  );
}
