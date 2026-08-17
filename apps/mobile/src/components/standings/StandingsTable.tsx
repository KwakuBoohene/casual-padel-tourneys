import { Pressable, ScrollView, View } from "react-native";
import { standingsPageSize, type StandingsLine } from "@padel/shared";

import { usePagedSlice } from "../../hooks/standings/usePagedSlice";
import { useBreakpoint } from "../../layout";
import { spacing, touch } from "../../theme";
import { useTheme } from "../../theme/ThemeProvider";

import { StandingsNameSlot, StandingsStatCells } from "./StandingsCells";
import { StandingsPager } from "./StandingsPager";

export interface StandingsTableRow {
  id: string;
  rank: number;
  name: string;
  line: StandingsLine;
}

interface StandingsTableProps {
  rows: StandingsTableRow[];
  onSelect?: (id: string) => void;
}

export function StandingsTable(props: StandingsTableProps) {
  const { colors } = useTheme();
  const { width, height } = useBreakpoint();
  const pageSize = standingsPageSize(width, height);
  const pages = usePagedSlice(props.rows.length, pageSize);
  const visible = props.rows.slice(pages.pageStart, pages.pageEnd);

  return (
    <View>
      <ScrollView
        horizontal
        bounces={false}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ flexGrow: 1 }}
      >
        <View
          style={{
            minWidth: 456,
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
            <StandingsNameSlot header name="Player" />
            <StandingsStatCells header />
          </View>
          {visible.map((row, index) => {
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
                <StandingsNameSlot rank={row.rank} name={row.name} />
                <StandingsStatCells line={row.line} />
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
      <StandingsPager
        total={props.rows.length}
        pageStart={pages.pageStart}
        pageEnd={pages.pageEnd}
        pageIndex={pages.pageIndex}
        pageCount={pages.pageCount}
        canGoPrev={pages.canGoPrev}
        canGoNext={pages.canGoNext}
        onPrev={pages.goPrev}
        onNext={pages.goNext}
      />
    </View>
  );
}
