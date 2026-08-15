import { Pressable, Text } from "react-native";

import { radius, spacing, touch } from "../../../theme";
import { useTheme } from "../../../theme/ThemeProvider";

import type { LeaderboardRow } from "../../../types/organizer/tournament";

interface LeaderboardRowCardProps {
  rank: number;
  row: LeaderboardRow;
  onPress: () => void;
}

export function LeaderboardRowCard(props: LeaderboardRowCardProps) {
  const { colors } = useTheme();
  const isLeader = props.rank === 1;

  return (
    <Pressable
      onPress={props.onPress}
      style={{
        minHeight: touch.minSecondary,
        borderRadius: 14,
        borderWidth: isLeader ? 2 : 1,
        borderColor: isLeader ? colors.primary : colors.border,
        backgroundColor: colors.surface,
        paddingHorizontal: spacing.md + 2,
        paddingVertical: spacing.md + 2,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        gap: spacing.sm
      }}
    >
      <Text style={{ flex: 1, fontSize: 16, fontWeight: "600", color: colors.text }} numberOfLines={1}>
        {props.rank}  {props.row.name}
      </Text>
      <Text style={{ fontSize: 14, fontWeight: "500", color: colors.muted }}>
        {props.row.totalPoints} pts  ›
      </Text>
    </Pressable>
  );
}
