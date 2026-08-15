import { Text, TextInput, View } from "react-native";

import { WizardChrome } from "../organizer/create/WizardChrome";
import { radius, spacing } from "../../theme";
import { useTheme } from "../../theme/ThemeProvider";

interface KohNameStepProps {
  stepIndex: number;
  stepCount: number;
  name: string;
  canContinue: boolean;
  onChangeName: (value: string) => void;
  onBack: () => void;
  onNext: () => void;
}

export function KohNameStep(props: KohNameStepProps) {
  const { colors } = useTheme();

  return (
    <WizardChrome
      modeLabel="King of the Hill"
      stepIndex={props.stepIndex}
      stepCount={props.stepCount}
      title="Name your night"
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
          placeholder="Friday Night Ladder"
          placeholderTextColor={colors.muted}
          style={{ color: colors.text, fontSize: 18, fontWeight: "600", paddingVertical: spacing.xs }}
        />
      </View>
    </WizardChrome>
  );
}
