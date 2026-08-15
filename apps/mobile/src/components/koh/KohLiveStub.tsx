import { Pressable, Text, View } from "react-native";

import type { KohTournamentHub } from "../../types/koh/create";
import { useBreakpoint } from "../../layout";
import { radius, spacing, touch, typography } from "../../theme";
import { useTheme } from "../../theme/ThemeProvider";

interface KohLiveStubProps {
  hub: KohTournamentHub;
  onBackToList: () => void;
}

export function KohLiveStub(props: KohLiveStubProps) {
  const { colors } = useTheme();
  const { formMaxWidth } = useBreakpoint();

  return (
    <View style={{ flex: 1, backgroundColor: colors.background, padding: spacing.xl, gap: spacing.md }}>
      <View style={{ maxWidth: formMaxWidth, width: "100%", alignSelf: "center", gap: spacing.md, flex: 1 }}>
        <Text style={[typography.title, { color: colors.text }]}>{props.hub.config.name}</Text>
        <Text style={{ color: colors.primary, fontWeight: "600" }}>King of the Hill · Live</Text>
        <Text style={{ color: colors.muted, fontSize: 14 }}>
          Tournament started. Full court hub (score, swap, promote) ships in the next ticket.
        </Text>
        {props.hub.courts.map((court) => (
          <View
            key={court.id}
            style={{
              borderRadius: radius.lg,
              borderWidth: 1,
              borderColor: colors.border,
              backgroundColor: colors.surface,
              padding: spacing.md,
              gap: 4
            }}
          >
            <Text style={{ color: colors.text, fontWeight: "700" }}>
              Court {court.courtNumber}
              {court.courtNumber === 1 ? " (Top)" : ""}
            </Text>
            <Text style={{ color: colors.muted, fontSize: 13 }}>
              King:{" "}
              {court.king
                ? `${court.king.playerAName} / ${court.king.playerBName}`
                : "—"}
            </Text>
            <Text style={{ color: colors.muted, fontSize: 13 }}>
              Next:{" "}
              {court.challenger
                ? `${court.challenger.playerAName} / ${court.challenger.playerBName}`
                : "—"}
            </Text>
            <Text style={{ color: colors.muted, fontSize: 13 }}>
              Waiting: {court.waiting.length}
            </Text>
          </View>
        ))}
      </View>
      <Pressable
        onPress={props.onBackToList}
        style={{
          minHeight: touch.minPrimary,
          borderRadius: radius.lg,
          backgroundColor: colors.primary,
          alignItems: "center",
          justifyContent: "center",
          maxWidth: formMaxWidth,
          width: "100%",
          alignSelf: "center"
        }}
      >
        <Text style={{ color: colors.onPrimary, fontWeight: "700", fontSize: 17 }}>Back to list</Text>
      </Pressable>
    </View>
  );
}
