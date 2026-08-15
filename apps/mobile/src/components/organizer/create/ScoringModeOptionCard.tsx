import { Pressable, Text, View } from "react-native";

import { radius, spacing, touch } from "../../../theme";
import { useTheme } from "../../../theme/ThemeProvider";

interface ScoringModeOptionCardProps {
  title: string;
  lines: string[];
  selected: boolean;
  onPress: () => void;
}

export function ScoringModeOptionCard(props: ScoringModeOptionCardProps) {
  const { colors } = useTheme();

  return (
    <Pressable
      onPress={props.onPress}
      style={{
        minHeight: touch.minSecondary,
        padding: spacing.lg,
        borderRadius: radius.lg,
        borderWidth: props.selected ? 2 : 1,
        borderColor: props.selected ? colors.primary : colors.border,
        backgroundColor: colors.surface,
        gap: spacing.sm
      }}
    >
      <Text style={{ color: colors.text, fontWeight: "700", fontSize: 15 }}>{props.title}</Text>
      <View style={{ gap: 2 }}>
        {props.lines.map((line) => (
          <Text key={line} style={{ color: colors.muted, fontSize: 13, lineHeight: 18 }}>
            {line}
          </Text>
        ))}
      </View>
    </Pressable>
  );
}
