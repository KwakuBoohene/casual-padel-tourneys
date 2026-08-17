import { Pressable, ScrollView, Text, View } from "react-native";
import {
  STANDINGS_COLUMNS,
  standingsCells,
  type StandingsLine
} from "@padel/shared";

import { spacing, touch } from "../../theme";
import { useTheme } from "../../theme/ThemeProvider";

const RANK_W = 22;
const COL_W = 28;
const GD_W = 34;

export interface StandingsTableRow {
  id: string;
  rank: number;
  name: string;
  line: StandingsLine;
}

function widthFor(key: string): number {
  return key === "gd" ? GD_W : COL_W;
}

function StatCells(props: { line?: StandingsLine; header?: boolean }) {
  const { colors } = useTheme();
  const values = props.line ? standingsCells(props.line) : null;
  return (
    <View style={{ flexDirection: "row", alignItems: "center" }}>
      {STANDINGS_COLUMNS.map((col) => (
        <Text
          key={col.key}
          accessibilityLabel={props.header ? col.title : `${col.title} ${values?.[col.key] ?? ""}`}
          style={{
            width: widthFor(col.key),
            textAlign: "right",
            fontVariant: ["tabular-nums"],
            fontSize: props.header ? 10 : 12,
            fontWeight: col.key === "gd" && !props.header ? "700" : "600",
            letterSpacing: props.header ? 0.3 : 0,
            color: props.header || col.key === "gd" ? colors.text : colors.muted
          }}
        >
          {props.header ? col.header : values?.[col.key]}
        </Text>
      ))}
    </View>
  );
}

function NameSlot(props: { rank?: number; name: string; header?: boolean }) {
  const { colors } = useTheme();
  return (
    <View style={{ flex: 1, flexDirection: "row", alignItems: "center", gap: spacing.sm, minWidth: 0 }}>
      <Text style={{ width: RANK_W, color: colors.muted, fontWeight: "700", fontSize: props.header ? 10 : 13 }}>
        {props.header ? "#" : props.rank}
      </Text>
      <Text
        numberOfLines={1}
        style={{
          flex: 1,
          color: colors.text,
          fontWeight: props.header ? "600" : "700",
          fontSize: props.header ? 10 : 14
        }}
      >
        {props.name}
      </Text>
    </View>
  );
}

interface StandingsTableProps {
  rows: StandingsTableRow[];
  onSelect?: (id: string) => void;
}

export function StandingsTable(props: StandingsTableProps) {
  const { colors } = useTheme();
  return (
    <ScrollView horizontal bounces={false} showsHorizontalScrollIndicator={false} contentContainerStyle={{ flexGrow: 1 }}>
    <View
      style={{
        minWidth: 340,
        flexGrow: 1,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: colors.surface,
        overflow: "hidden"
      }}
    >
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: spacing.sm,
          paddingHorizontal: spacing.md,
          paddingVertical: spacing.sm,
          borderBottomWidth: 1,
          borderBottomColor: colors.border
        }}
      >
        <NameSlot header name="Player" />
        <StatCells header />
      </View>
      {props.rows.map((row, index) => {
        const body = (
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: spacing.sm,
              minHeight: touch.minSecondary,
              paddingHorizontal: spacing.md,
              borderTopWidth: index === 0 ? 0 : 1,
              borderTopColor: colors.border
            }}
          >
            <NameSlot rank={row.rank} name={row.name} />
            <StatCells line={row.line} />
          </View>
        );
        if (!props.onSelect) {
          return <View key={row.id}>{body}</View>;
        }
        return (
          <Pressable key={row.id} onPress={() => props.onSelect?.(row.id)} accessibilityRole="button">
            {body}
          </Pressable>
        );
      })}
    </View>
    </ScrollView>
  );
}
