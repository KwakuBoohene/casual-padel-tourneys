import { Pressable, Text, View } from "react-native";

import { radius, spacing } from "../../../theme";
import { useTheme } from "../../../theme/ThemeProvider";

interface PlayerSuggestionsProps {
  suggestions: string[];
  usedNames: string[];
  onSelect: (name: string) => void;
}

export function PlayerSuggestions(props: PlayerSuggestionsProps) {
  const { colors } = useTheme();
  if (props.suggestions.length === 0) return null;

  return (
    <View style={{ marginTop: spacing.sm, gap: spacing.xs }}>
      <Text style={{ fontSize: 12, color: colors.muted }}>Suggestions</Text>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.xs }}>
        {props.suggestions.slice(0, 12).map((suggestion) => {
          const used = props.usedNames.some(
            (p) => p.trim().toLowerCase() === suggestion.trim().toLowerCase()
          );
          return (
            <Pressable
              key={suggestion}
              disabled={used}
              onPress={() => props.onSelect(suggestion)}
              style={{
                paddingHorizontal: spacing.sm,
                paddingVertical: spacing.xs,
                borderRadius: radius.pill,
                borderWidth: 1,
                borderColor: used ? colors.border : colors.primary,
                opacity: used ? 0.45 : 1
              }}
            >
              <Text style={{ fontSize: 12, color: used ? colors.muted : colors.text }}>{suggestion}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
