import { Pressable, ScrollView, Text, View } from "react-native";

import { colors, radius, spacing, typography } from "../../theme";

interface ProfileScreenProps {
  user: { id: string; name?: string; email: string; avatarUrl?: string; isGuest?: boolean };
  onBack: () => void;
  onSignOut: () => void;
}

export function ProfileScreen(props: ProfileScreenProps) {
  const displayInitial = (props.user.name ?? "G")[0]?.toUpperCase();
  const isGuest = props.user.isGuest === true;

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
              {displayInitial}
            </Text>
          </View>
          <View style={{ gap: 2 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.sm }}>
              <Text style={{ color: colors.text, fontWeight: "700", fontSize: 18 }}>{props.user.name ?? "Organizer"}</Text>
              {isGuest ? (
                <View
                  style={{
                    backgroundColor: colors.surfaceAlt,
                    borderRadius: radius.sm,
                    paddingVertical: 2,
                    paddingHorizontal: 6,
                    borderWidth: 1,
                    borderColor: colors.border
                  }}
                >
                  <Text style={{ color: colors.muted, fontSize: 10, fontWeight: "600" }}>GUEST</Text>
                </View>
              ) : null}
            </View>
            {!isGuest ? (
              <Text style={{ color: colors.muted, fontSize: 12 }}>{props.user.email}</Text>
            ) : null}
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

