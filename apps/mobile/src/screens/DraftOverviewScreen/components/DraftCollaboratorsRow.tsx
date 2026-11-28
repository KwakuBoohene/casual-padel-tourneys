import { Pressable, Text, View } from "react-native";
import type { DraftPerson } from "@padel/shared";

import { DraftCollaboratorAvatars } from "../../../components/organizer/list/DraftCollaboratorAvatars";
import { spacing } from "../../../theme";
import { useTheme } from "../../../theme/ThemeProvider";

interface DraftCollaboratorsRowProps {
  editors: DraftPerson[];
  /** Opens the share sheet (when sharing is enabled). */
  onPress?: () => void;
}

const initials = (name: string) => {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const letters = parts.length > 1 ? parts[0][0] + parts[parts.length - 1][0] : (parts[0] ?? "?").slice(0, 2);
  return letters.toUpperCase();
};

/** "Co-organizers" row; hidden until someone has accepted an invite. */
export function DraftCollaboratorsRow({ editors, onPress }: DraftCollaboratorsRowProps) {
  const { colors } = useTheme();
  if (editors.length === 0) return null;
  const people = editors.map((editor) => ({ userId: editor.userId, name: editor.name, initials: initials(editor.name) }));
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      accessibilityRole={onPress ? "button" : undefined}
      accessibilityHint={onPress ? "Manage who has access" : undefined}
      style={{ flexDirection: "row", alignItems: "center", gap: spacing.sm, paddingVertical: spacing.xs }}
    >
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={{ fontSize: 12, fontWeight: "700", color: colors.muted }}>CO-ORGANIZERS</Text>
        <Text style={{ fontSize: 14, color: colors.text }} numberOfLines={1}>
          {editors.map((editor) => editor.name).join(", ")}
        </Text>
      </View>
      <DraftCollaboratorAvatars people={people} />
    </Pressable>
  );
}
