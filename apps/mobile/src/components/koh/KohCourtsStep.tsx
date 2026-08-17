import { Text, View } from "react-native";

import { SettingsStepper } from "../organizer/create/SettingsStepper";
import { WizardChrome } from "../organizer/create/WizardChrome";
import { radius, spacing } from "../../theme";
import { useTheme } from "../../theme/ThemeProvider";

interface KohCourtsStepProps {
  stepIndex: number;
  stepCount: number;
  courts: number;
  onChangeCourts: (value: number) => void;
  onBack: () => void;
  onNext: () => void;
}

export function KohCourtsStep(props: KohCourtsStepProps) {
  const { colors } = useTheme();
  const labels = Array.from({ length: props.courts }, (_, index) => {
    const n = index + 1;
    return n === 1 ? `Court ${n} (Top court)` : `Court ${n}`;
  });

  return (
    <WizardChrome
      modeLabel="King of the Court"
      stepIndex={props.stepIndex}
      stepCount={props.stepCount}
      title="How many courts?"
      subtitle="Winner-stays: Court 1 is always top. Single court allowed."
      primaryLabel="Next"
      onPrimary={props.onNext}
      onBack={props.onBack}
    >
      <SettingsStepper
        label="Courts"
        value={props.courts}
        min={1}
        max={8}
        onChange={props.onChangeCourts}
      />
      <View
        style={{
          borderRadius: radius.lg,
          borderWidth: 1,
          borderColor: colors.border,
          backgroundColor: colors.surface,
          padding: spacing.md,
          gap: spacing.xs
        }}
      >
        {labels.map((label) => (
          <Text key={label} style={{ color: colors.text, fontSize: 15, fontWeight: "600" }}>
            {label}
          </Text>
        ))}
      </View>
    </WizardChrome>
  );
}
