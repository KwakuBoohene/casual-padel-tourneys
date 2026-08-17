import { Text, View } from "react-native";
import { STANDINGS_COLUMNS, standingsCells, type StandingsLine } from "@padel/shared";

import { spacing } from "../../theme";
import { useTheme } from "../../theme/ThemeProvider";

const RANK_W = 22;
const COL_W = 28;
const GD_W = 34;
const AM_W = 42;

function widthFor(key: string): number {
  if (key === "pwa" || key === "pla") return AM_W;
  if (key === "gd" || key === "pts") return GD_W;
  return COL_W;
}

export function StandingsStatCells(props: { line?: StandingsLine; header?: boolean }) {
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
            fontWeight: (col.key === "gd" || col.key === "pts") && !props.header ? "700" : "600",
            letterSpacing: props.header ? 0.3 : 0,
            color: props.header || col.key === "gd" || col.key === "pts" ? colors.text : colors.muted
          }}
        >
          {props.header ? col.header : values?.[col.key]}
        </Text>
      ))}
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
