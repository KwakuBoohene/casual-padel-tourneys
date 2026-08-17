import { Pressable, Text, TextInput, View } from "react-native";
import { filterPlayerNameSuggestions } from "@padel/shared";

import { radius, spacing, touch } from "../../theme";
import { useTheme } from "../../theme/ThemeProvider";

interface NameSuggestFieldProps {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  names: string[];
  usedNames: string[];
  autoFocus?: boolean;
}

export function NameSuggestField(props: NameSuggestFieldProps) {
  const { colors } = useTheme();
  const matches = filterPlayerNameSuggestions(props.value, props.names, props.usedNames);

  return (
    <View style={{ gap: spacing.xs }}>
      <View
        style={{
          borderRadius: radius.lg,
          borderWidth: 1,
          borderColor: colors.border,
          backgroundColor: colors.surface,
          paddingHorizontal: spacing.md,
          paddingVertical: spacing.sm
        }}
      >
        {props.label ? (
          <Text style={{ fontSize: 12, color: colors.muted }}>{props.label}</Text>
        ) : null}
        <TextInput
          value={props.value}
          onChangeText={props.onChange}
          placeholder={props.placeholder ?? "Player name"}
          placeholderTextColor={colors.muted}
          autoFocus={props.autoFocus}
          autoCapitalize="words"
          style={{ color: colors.text, fontSize: 18, fontWeight: "600", paddingVertical: spacing.xs }}
        />
      </View>
      {matches.map((name) => (
        <Pressable
          key={name}
          onPress={() => props.onChange(name)}
          accessibilityRole="button"
          accessibilityLabel={`Use saved name ${name}`}
          style={{
            minHeight: touch.minSecondary,
            borderRadius: radius.md,
            borderWidth: 1,
            borderColor: colors.primary,
            backgroundColor: colors.surface,
            paddingHorizontal: spacing.md,
            justifyContent: "center"
          }}
        >
          <Text style={{ color: colors.text, fontWeight: "600" }}>{name}</Text>
        </Pressable>
      ))}
    </View>
  );
}
