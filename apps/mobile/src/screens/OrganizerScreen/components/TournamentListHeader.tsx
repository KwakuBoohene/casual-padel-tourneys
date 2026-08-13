import { Pressable, Text, View } from "react-native";

import { ThemeToggle } from "../../../components/ThemeToggle";
import { radius, spacing, touch } from "../../../theme";
import { useTheme } from "../../../theme/ThemeProvider";

interface TournamentListHeaderProps {
  onOpenProfile?: () => void;
}

export function TournamentListHeader(props: TournamentListHeaderProps) {
  const { colors } = useTheme();

  return (
    <View
      style={{
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: spacing.sm,
        gap: spacing.md
      }}
    >
      <Text style={{ flex: 1, fontSize: 28, fontWeight: "700", color: colors.text }}>Tournaments</Text>
      <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.sm }}>
        <ThemeToggle compact />
        <Pressable
          onPress={props.onOpenProfile}
          accessibilityRole="button"
          accessibilityLabel="Open profile"
          style={{
            width: touch.minSecondary,
            height: touch.minSecondary,
            borderRadius: radius.pill,
            borderWidth: 2,
            borderColor: colors.primary,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: colors.surface
          }}
        >
          <Text style={{ fontSize: 18 }} accessibilityElementsHidden>
            👤
          </Text>
        </Pressable>
      </View>
    </View>
  );
}
