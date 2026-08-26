import { Pressable, Text, View } from "react-native";
import {
  standingsCells,
  type StandingsColumnKey,
  type StandingsLine,
  type StandingsSortState
} from "@padel/shared";

import {
  standingsColumnWidth,
  type StandingsColumn
} from "../../utilities/standings/columnWidth";
import { spacing } from "../../theme";
import { useTheme } from "../../theme/ThemeProvider";

const RANK_W = 22;

interface StatCellsProps {
  /** The columns to render, already filtered and in table order. */
  columns: StandingsColumn[];
  line?: StandingsLine;
  header?: boolean;
  /** Active sort, when the table is sortable. Absent on a single-row table. */
  sort?: StandingsSortState | null;
  onPressColumn?: (key: StandingsColumnKey) => void;
}

const CARET = { asc: "\u25B2", desc: "\u25BC" } as const;

export function StandingsStatCells(props: StatCellsProps) {
  const { colors } = useTheme();
  const values = props.line ? standingsCells(props.line) : null;
  const sortable = props.header && !!props.onPressColumn;

  return (
    <View style={{ flexDirection: "row", alignItems: "center" }}>
      {props.columns.map((col) => {
        const active = props.sort?.key === col.key ? props.sort : null;
        const emphasised = col.key === "gd" || col.key === "pts";
        const label = (
          <Text
            key={col.key}
            numberOfLines={1}
            accessibilityLabel={
              props.header ? col.title : `${col.title} ${values?.[col.key] ?? ""}`
            }
            style={{
              width: standingsColumnWidth(col.key),
              textAlign: "right",
              fontVariant: ["tabular-nums"],
              fontSize: props.header ? 10 : 12,
              fontWeight: (emphasised && !props.header) || active ? "700" : "600",
              letterSpacing: props.header ? 0.3 : 0,
              color: active
                ? colors.primary
                : props.header || emphasised
                  ? colors.text
                  : colors.muted
            }}
          >
            {props.header ? `${col.header}${active ? CARET[active.direction] : ""}` : values?.[col.key]}
          </Text>
        );

        if (!sortable) return label;
        return (
          <Pressable
            key={col.key}
            onPress={() => props.onPressColumn?.(col.key)}
            accessibilityRole="button"
            accessibilityLabel={
              active
                ? `${col.title}, sorted ${active.direction === "asc" ? "ascending" : "descending"}`
                : `Sort by ${col.title}`
            }
          >
            {label}
          </Pressable>
        );
      })}
    </View>
  );
}

export function StandingsNameSlot(props: { rank?: number; name: string; header?: boolean }) {
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
