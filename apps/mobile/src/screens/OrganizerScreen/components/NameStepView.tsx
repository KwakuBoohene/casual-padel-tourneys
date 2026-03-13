import { Pressable, Text, TextInput, View } from "react-native";

import { colors, radius, spacing, typography } from "../../../theme";

interface NameStepViewProps {
  name: string;
  canContinue: boolean;
  onChangeName: (value: string) => void;
  onBack: () => void;
  onNext: () => void;
}

export function NameStepView(props: NameStepViewProps) {
  return (
    <View
      style={{
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        padding: spacing.lg,
        backgroundColor: colors.background
      }}
    >
      <View
        style={{
          width: "100%",
          maxWidth: 420,
          padding: spacing.lg,
          borderRadius: radius.lg,
          backgroundColor: colors.surface
        }}
      >
        <Text style={[typography.title, { color: colors.text, marginBottom: spacing.sm }]}>Name Your Tournament</Text>
        <Text style={{ color: colors.muted, marginBottom: spacing.md }}>
          Give your tournament a short and memorable name. You can change this later.
        </Text>
        <TextInput
          value={props.name}
          onChangeText={props.onChangeName}
          placeholder="Tournament name"
          style={{
            borderWidth: 1,
            borderColor: colors.border,
            padding: spacing.sm,
            borderRadius: radius.md,
            backgroundColor: colors.surface,
            color: colors.text
          }}
          placeholderTextColor={colors.muted}
        />
        <View style={{ flexDirection: "row", gap: spacing.sm, marginTop: spacing.lg }}>
          <Pressable
            onPress={props.onBack}
            style={{
              flex: 1,
              paddingVertical: spacing.sm,
              borderRadius: radius.md,
              backgroundColor: colors.surface,
              borderWidth: 1,
              borderColor: colors.border,
              alignItems: "center",
              justifyContent: "center"
            }}
          >
            <Text style={{ color: colors.text, fontWeight: "600" }}>Back</Text>
          </Pressable>
          <Pressable
            disabled={!props.canContinue}
            onPress={props.onNext}
            style={{
              flex: 1,
              paddingVertical: spacing.sm,
              borderRadius: radius.md,
              backgroundColor: props.canContinue ? colors.primary : colors.surfaceAlt,
              alignItems: "center",
              justifyContent: "center",
              opacity: props.canContinue ? 1 : 0.5
            }}
          >
            <Text
              style={{
                color: "#020617",
                fontWeight: "700"
              }}
            >
              Continue
            </Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

