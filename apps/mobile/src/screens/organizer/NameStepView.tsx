import { Pressable, Text, TextInput, View } from "react-native";

import { colors, radius, spacing, typography } from "../../theme";

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
        gap: spacing.md,
        backgroundColor: colors.background
      }}
    >
      <Text style={[typography.title, { color: colors.text }]}>Tournament Name</Text>
      <TextInput
        value={props.name}
        onChangeText={props.onChangeName}
        placeholder="Friday Americano"
        style={{
          borderWidth: 1,
          borderColor: colors.border,
          padding: spacing.sm,
          width: "90%",
          maxWidth: 420,
          borderRadius: radius.md,
          backgroundColor: colors.surface,
          color: colors.text
        }}
        placeholderTextColor={colors.muted}
      />
      <View style={{ flexDirection: "row", gap: spacing.sm }}>
        <Pressable
          onPress={props.onBack}
          style={{
            paddingVertical: spacing.sm,
            paddingHorizontal: spacing.lg,
            borderRadius: radius.md,
            backgroundColor: colors.surface,
            borderWidth: 1,
            borderColor: colors.border
          }}
        >
          <Text style={{ color: colors.text, fontWeight: "600" }}>Back</Text>
        </Pressable>
        <Pressable
          onPress={props.canContinue ? props.onNext : undefined}
          style={{
            paddingVertical: spacing.sm,
            paddingHorizontal: spacing.lg,
            borderRadius: radius.md,
            backgroundColor: props.canContinue ? colors.primary : colors.border
          }}
        >
          <Text
            style={{
              color: props.canContinue ? "#020617" : colors.muted,
              fontWeight: "700"
            }}
          >
            Next
          </Text>
        </Pressable>
      </View>
    </View>
  );
}
