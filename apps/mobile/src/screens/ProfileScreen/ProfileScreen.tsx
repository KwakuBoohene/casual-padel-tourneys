import { Pressable, ScrollView, Text, View } from "react-native";

import { colors, radius, spacing, typography } from "../../theme";

interface ProfileScreenProps {
  user: { id: string; name?: string; email: string; avatarUrl?: string };
  onBack: () => void;
  onSignOut: () => void;
}

export function ProfileScreen(props: ProfileScreenProps) {
  return (
    <ScrollView
      contentContainerStyle={{
        flexGrow: 1,
        backgroundColor: colors.background,
        padding: spacing.lg
      }}
    >
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: spacing.lg }}>
        <Text style={[typography.title, { color: colors.text }]}>Profile</Text>
        <Pressable
          onPress={props.onBack}
          style={{
            paddingVertical: spacing.xs,
            paddingHorizontal: spacing.md,
            borderRadius: radius.md,
            backgroundColor: colors.surface,
            borderWidth: 1,
            borderColor: colors.border
          }}
        >
          <Text style={{ color: colors.text, fontWeight: "600" }}>Back</Text>
        </Pressable>
      </View>

      <View
        style={{
          backgroundColor: colors.surface,
          borderRadius: radius.lg,
          padding: spacing.lg,
          borderWidth: 1,
          borderColor: colors.border,
          marginBottom: spacing.lg
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.md }}>
          <View
            style={{
              width: 48,
              height: 48,
              borderRadius: radius.pill,
              backgroundColor: colors.surfaceAlt,
              alignItems: "center",
              justifyContent: "center"
            }}
          >
            <Text style={{ color: colors.primary, fontWeight: "700", fontSize: 20 }}>
              {(props.user.name ?? props.user.email)[0]?.toUpperCase()}
            </Text>
          </View>
          <View>
            <Text style={{ color: colors.text, fontWeight: "700", fontSize: 18 }}>{props.user.name ?? "Organizer"}</Text>
            <Text style={{ color: colors.muted, fontSize: 12 }}>{props.user.email}</Text>
          </View>
        </View>
      </View>

      <Pressable
        onPress={props.onSignOut}
        style={{
          marginTop: spacing.lg,
          paddingVertical: spacing.sm,
          borderRadius: radius.md,
          backgroundColor: colors.surface,
          borderWidth: 1,
          borderColor: colors.border,
          alignItems: "center",
          justifyContent: "center"
        }}
      >
        <Text style={{ color: colors.text, fontWeight: "600" }}>Sign Out</Text>
      </Pressable>
    </ScrollView>
  );
}

