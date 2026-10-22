import type { ReactNode } from "react";
import { ActivityIndicator, Pressable, Text, View } from "react-native";
import { router } from "expo-router";
import { useOrganizerAccount } from "../../providers/OrganizerAccountProvider";
import { useTheme } from "../../theme/ThemeProvider";
import { pendingOrganizerWrites } from "../../api/organizerContext";

export function OrganizerAccountChrome({ children }: { children: ReactNode }) {
  const account = useOrganizerAccount();
  const { colors } = useTheme();
  if (!account.ready || !account.selected)
    return <ActivityIndicator style={{ flex: 1 }} color={colors.primary} />;
  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View
        style={{
          paddingHorizontal: 20,
          paddingVertical: 10,
          gap: 6,
          borderBottomWidth: 1,
          borderColor: colors.border
        }}
      >
        <View
          style={{ flexDirection: "row", gap: 12, alignItems: "center", justifyContent: "space-between" }}
        >
          <Text style={{ color: colors.muted, flex: 1, fontSize: 12 }}>
            {account.selected.role === "MANAGER"
              ? `Managing: ${account.selected.name}'s organizer account · Manager`
              : "My organizer account · Owner"}
          </Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Organizer access"
            onPress={() => {
              if (!pendingOrganizerWrites()) router.push("/organizer-access");
            }}
            style={{ minHeight: 44, justifyContent: "center", paddingHorizontal: 10 }}
          >
            <Text style={{ color: colors.primary, fontWeight: "700", fontSize: 13 }}>Organizer access</Text>
          </Pressable>
        </View>
        {account.notice ? (
          <Text accessibilityRole="alert" style={{ color: colors.danger }}>
            {account.notice}
          </Text>
        ) : null}
      </View>
      {children}
    </View>
  );
}
