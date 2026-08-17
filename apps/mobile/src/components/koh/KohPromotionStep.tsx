import { Pressable, Text, View } from "react-native";

import type { KohDraftPromoRule } from "../../types/koh/create";
import { SettingsStepper } from "../organizer/create/SettingsStepper";
import { WizardChrome } from "../organizer/create/WizardChrome";
import { radius, spacing, touch } from "../../theme";
import { useTheme } from "../../theme/ThemeProvider";

interface KohPromotionStepProps {
  stepIndex: number;
  stepCount: number;
  promoRules: KohDraftPromoRule[];
  onChangeRules: (rules: KohDraftPromoRule[]) => void;
  onBack: () => void;
  onNext: () => void;
}

export function KohPromotionStep(props: KohPromotionStepProps) {
  const { colors } = useTheme();

  const updateRule = (courtNumber: number, patch: Partial<KohDraftPromoRule>) => {
    props.onChangeRules(
      props.promoRules.map((rule) =>
        rule.courtNumber === courtNumber ? { ...rule, ...patch } : rule
      )
    );
  };

  return (
    <WizardChrome
      modeLabel="King of the Court"
      stepIndex={props.stepIndex}
      stepCount={props.stepCount}
      title="Promotion rules"
      subtitle="When a king wins enough, they swap with the weakest on the upper court."
      primaryLabel="Next"
      onPrimary={props.onNext}
      onBack={props.onBack}
    >
      {props.promoRules.map((rule) => (
        <View
          key={rule.courtNumber}
          style={{
            borderRadius: radius.lg,
            borderWidth: 1,
            borderColor: colors.border,
            backgroundColor: colors.surface,
            padding: spacing.md,
            gap: spacing.sm
          }}
        >
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
            <Text style={{ color: colors.text, fontWeight: "700", fontSize: 15 }}>
              Court {rule.courtNumber} → Court {rule.courtNumber - 1}
            </Text>
            <Pressable
              onPress={() => updateRule(rule.courtNumber, { enabled: !rule.enabled })}
              style={{
                minHeight: touch.minSecondary,
                minWidth: 72,
                borderRadius: radius.md,
                backgroundColor: rule.enabled ? colors.primary : colors.surfaceAlt,
                alignItems: "center",
                justifyContent: "center",
                paddingHorizontal: spacing.sm
              }}
            >
              <Text
                style={{
                  color: rule.enabled ? colors.onPrimary : colors.text,
                  fontWeight: "700"
                }}
              >
                {rule.enabled ? "On" : "Off"}
              </Text>
            </Pressable>
          </View>
          {rule.enabled ? (
            <SettingsStepper
              label="Wins required"
              value={rule.winsRequired}
              min={1}
              max={12}
              onChange={(winsRequired) => updateRule(rule.courtNumber, { winsRequired })}
            />
          ) : null}
        </View>
      ))}
    </WizardChrome>
  );
}
