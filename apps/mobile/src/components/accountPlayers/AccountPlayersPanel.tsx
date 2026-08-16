import { Pressable, ScrollView, Text, TextInput, View } from "react-native";
import {
  formatOrganizerPlayerLeaderboardMode,
  type OrganizerPlayerLeaderboardMode,
  type OrganizerPlayerLeaderboardRow,
  type OrganizerPlayerRange
} from "@padel/shared";

import { radius, spacing, touch, typography } from "../../theme";
import { useTheme } from "../../theme/ThemeProvider";

const RANGES: { id: OrganizerPlayerRange; label: string }[] = [
  { id: "month", label: "Month" },
  { id: "year", label: "Year" },
  { id: "all", label: "All time" }
];

const MODES: OrganizerPlayerLeaderboardMode[] = [
  "overall",
  "AMERICANO",
  "MEXICANO",
  "KING_OF_THE_HILL"
];

interface AccountPlayersPanelProps {
  range: OrganizerPlayerRange;
  onRange: (range: OrganizerPlayerRange) => void;
  mode: OrganizerPlayerLeaderboardMode;
  onMode: (mode: OrganizerPlayerLeaderboardMode) => void;
  searchQuery: string;
  onSearchQuery: (value: string) => void;
  rows: OrganizerPlayerLeaderboardRow[];
  loading: boolean;
  errorText: string;
  guestMessage: string | null;
  onSelect: (id: string) => void;
  onBack: () => void;
  onAttach?: () => void;
}

function emptyMessage(mode: OrganizerPlayerLeaderboardMode, hasSearch: boolean): string {
  if (hasSearch) return "No players match your search in this range.";
  if (mode === "overall") return "No career matches yet in this range.";
  return `No ${formatOrganizerPlayerLeaderboardMode(mode).toLowerCase()} results in this range.`;
}

export function AccountPlayersPanel(props: AccountPlayersPanelProps) {
  const { colors } = useTheme();
  const hasSearch = props.searchQuery.trim().length > 0;

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView contentContainerStyle={{ padding: spacing.xl, gap: spacing.md, paddingBottom: spacing.xxl }}>
        <Text style={[typography.title, { color: colors.text }]}>Players</Text>
        <Text style={{ color: colors.muted, fontSize: 13 }}>
          Your account · career rankings across opted-in events
        </Text>
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
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spacing.sm }}>
          {MODES.map((entry) => {
            const active = props.mode === entry;
            return (
              <Pressable
                key={entry}
                onPress={() => props.onMode(entry)}
                style={{
                  minHeight: touch.minSecondary,
                  paddingHorizontal: spacing.lg,
                  borderRadius: radius.pill,
                  borderWidth: active ? 2 : 1,
                  borderColor: active ? colors.primary : colors.border,
                  alignItems: "center",
                  justifyContent: "center"
                }}
              >
                <Text style={{ color: active ? colors.primary : colors.text, fontWeight: "700" }}>
                  {formatOrganizerPlayerLeaderboardMode(entry)}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
        <TextInput
          value={props.searchQuery}
          onChangeText={props.onSearchQuery}
          placeholder="Search players…"
          placeholderTextColor={colors.muted}
          accessibilityLabel="Search career players"
          style={{
            minHeight: touch.minSecondary,
            borderRadius: radius.lg,
            borderWidth: 1,
            borderColor: colors.border,
            backgroundColor: colors.surface,
            paddingHorizontal: spacing.lg,
            color: colors.text,
            fontSize: 16
          }}
        />
        {props.guestMessage ? (
          <View
            style={{
              borderRadius: radius.lg,
              borderWidth: 1,
              borderColor: colors.border,
              padding: spacing.lg,
              gap: spacing.sm
            }}
          >
            <Text style={{ color: colors.text, lineHeight: 20 }}>{props.guestMessage}</Text>
            {props.onAttach ? (
              <Pressable
                onPress={props.onAttach}
                style={{
                  minHeight: touch.minSecondary,
                  borderRadius: radius.lg,
                  backgroundColor: colors.primary,
                  alignItems: "center",
                  justifyContent: "center"
                }}
              >
                <Text style={{ color: colors.onPrimary, fontWeight: "700" }}>Attach account</Text>
              </Pressable>
            ) : null}
          </View>
        ) : null}
        {props.loading ? <Text style={{ color: colors.muted }}>Loading…</Text> : null}
        {props.errorText ? <Text style={{ color: colors.danger }}>{props.errorText}</Text> : null}
        {!props.loading && !props.guestMessage && props.rows.length === 0 ? (
          <Text style={{ color: colors.muted }}>{emptyMessage(props.mode, hasSearch)}</Text>
        ) : null}
        {props.rows.map((row) => (
          <Pressable
            key={row.id}
            onPress={() => props.onSelect(row.id)}
            style={{
              minHeight: touch.minPrimary,
              borderRadius: radius.lg,
              borderWidth: 1,
              borderColor: colors.border,
              backgroundColor: colors.surface,
              padding: spacing.lg,
              flexDirection: "row",
              alignItems: "center",
              gap: spacing.md
            }}
          >
            <Text style={{ color: colors.muted, fontWeight: "700", width: 28 }}>{row.rank}</Text>
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={{ color: colors.text, fontWeight: "700", fontSize: 16 }}>{row.name}</Text>
              <Text style={{ color: colors.muted, fontSize: 13 }}>
                {row.matchesWon} match wins · {row.gamesWon} games won
              </Text>
            </View>
            <Text style={{ color: colors.muted, fontWeight: "700" }}>›</Text>
          </Pressable>
        ))}
      </ScrollView>
      <Pressable
        onPress={props.onBack}
        style={{ alignItems: "center", padding: spacing.xl, minHeight: touch.minSecondary }}
      >
        <Text style={{ color: colors.muted, fontWeight: "600" }}>Back</Text>
      </Pressable>
    </View>
  );
}
