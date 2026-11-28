import { Pressable, Text, View } from "react-native";

import { spacing } from "../../../../theme";
import { useTheme } from "../../../../theme/ThemeProvider";

export interface PersonRowAction {
  label: string;
  onPress: () => void;
  danger?: boolean;
  disabled?: boolean;
}

interface DraftPersonRowProps {
  title: string;
  subtitle: string;
  tag: string;
  actions?: PersonRowAction[];
}

/** One line in "People with access": owner, editor or pending invite. */
export function DraftPersonRow({ title, subtitle, tag, actions = [] }: DraftPersonRowProps) {
  const { colors } = useTheme();
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.sm, paddingVertical: spacing.xs }}>
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={{ fontSize: 15, fontWeight: "600", color: colors.text }} numberOfLines={1}>
          {title}
        </Text>
        <Text style={{ fontSize: 12, color: colors.muted }} numberOfLines={1}>
          {tag} · {subtitle}
        </Text>
      </View>
      {actions.map((action) => (
        <Pressable
          key={action.label}
          onPress={action.onPress}
          disabled={action.disabled}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel={`${action.label} ${title}`}
          style={{ opacity: action.disabled ? 0.45 : 1 }}
        >
          <Text style={{ fontSize: 13, fontWeight: "600", color: action.danger ? colors.danger : colors.primary }}>
            {action.label}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}
