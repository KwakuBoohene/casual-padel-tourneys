import type { OrganizerPlayerRange } from "@padel/shared";
import { Pressable, Text, View } from "react-native";

import { StandingsHelpControl } from "../standings/StandingsHelpControl";
import { radius, spacing, touch, typography } from "../../theme";
import { useTheme } from "../../theme/ThemeProvider";

const RANGES: { id: OrganizerPlayerRange; label: string }[] = [
  { id: "month", label: "Month" },
  { id: "year", label: "Year" },
  { id: "all", label: "All time" }
];

interface AccountPlayersHeaderProps {
  range: OrganizerPlayerRange;
  onRange: (range: OrganizerPlayerRange) => void;
  /** Guests have no career board, so they get neither share nor export. */
  showActions: boolean;
  onShare: () => void;
  onExport: () => void;
}

export function AccountPlayersHeader(props: AccountPlayersHeaderProps) {
  const { colors } = useTheme();
  const action = (label: string, onPress: () => void) => (
    <Pressable onPress={onPress} hitSlop={8}>
      <Text style={{ color: colors.primary, fontWeight: "500", fontSize: 14 }}>{label}</Text>
    </Pressable>
  );

  return (
    <>
      <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.md }}>
        <Text style={[typography.title, { color: colors.text, flex: 1 }]}>Account Leaderboard</Text>
        {props.showActions ? action("Share", props.onShare) : null}
        {props.showActions ? action("Export", props.onExport) : null}
        <StandingsHelpControl />
      </View>
      <View style={{ flexDirection: "row", gap: spacing.sm }}>
        {RANGES.map((entry) => {
          const active = props.range === entry.id;
          return (
            <Pressable
              key={entry.id}
              onPress={() => props.onRange(entry.id)}
              style={{
                flex: 1,
                minHeight: touch.minSecondary,
                borderRadius: radius.pill,
                borderWidth: active ? 2 : 1,
                borderColor: active ? colors.primary : colors.border,
                alignItems: "center",
                justifyContent: "center"
              }}
            >
              <Text style={{ color: active ? colors.primary : colors.text, fontWeight: "700" }}>
                {entry.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </>
  );
}
