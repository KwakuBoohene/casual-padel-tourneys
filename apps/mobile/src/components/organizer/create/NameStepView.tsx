import { Text, TextInput, View } from "react-native";

import type { TournamentMode } from "@padel/shared";

import { radius, spacing } from "../../../theme";
import { useTheme } from "../../../theme/ThemeProvider";
import { tournamentNamePlaceholder } from "../../../utilities/organizer/tournamentNamePlaceholder";

import { WizardChrome } from "./WizardChrome";

interface NameStepViewProps {
  modeLabel: string;
  mode?: TournamentMode | null;
  name: string;
  canContinue: boolean;
  onChangeName: (value: string) => void;
  onBack: () => void;
  onNext: () => void;
}

export function NameStepView(props: NameStepViewProps) {
  const { colors } = useTheme();
  const placeholder = tournamentNamePlaceholder(new Date(), props.mode);

  return (
    <WizardChrome
      modeLabel={props.modeLabel}
      stepIndex={1}
      stepCount={4}
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
          style={{
            color: colors.text,
            fontSize: 18,
            fontWeight: "600",
            paddingVertical: spacing.xs
          }}
        />
      </View>
    </WizardChrome>
  );
}
