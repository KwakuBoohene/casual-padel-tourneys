import { Pressable, ScrollView, View } from "react-native";
import { sortAfterHiding, standingsPageSize, visibleStandingsColumns, type StandingsLine } from "@padel/shared";

import { useEffect } from "react";

import { usePagedSlice } from "../../hooks/standings/usePagedSlice";
import { useStandingsSort } from "../../hooks/standings/useStandingsSort";
import { useStandingsColumns } from "../../providers/StandingsColumnsProvider";
import { useBreakpoint } from "../../layout";
import { spacing, touch } from "../../theme";
import { useTheme } from "../../theme/ThemeProvider";
import { ListPager } from "../lists/ListPager";

import {
  NAME_AND_PADDING_W,
  standingsStatsWidth
} from "../../utilities/standings/columnWidth";

import { StandingsNameSlot, StandingsStatCells } from "./StandingsCells";

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
  const sorting = useStandingsSort(props.rows, pages.reset);
  const { visible: visibleColumns } = useStandingsColumns();
  const columns = visibleStandingsColumns(visibleColumns);
  // One row cannot be reordered; offering a sort there would just show a caret that does nothing.
  const sortable = props.rows.length > 1;

  // A table ordered by a column that is no longer on screen has no visible explanation for its
  // order, so hiding the sorted column drops back to rank order.
  useEffect(() => {
    if (sorting.sort && sortAfterHiding(sorting.sort, visibleColumns) === null) {
      sorting.clearSort();
    }
  }, [visibleColumns, sorting]);
  const visible = sorting.sorted.slice(pages.pageStart, pages.pageEnd);

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
            // Derived, not a magic number: the stat columns plus room for rank, name and padding.
            // Adding a column to STANDINGS_COLUMNS widens the table instead of squeezing the name.
            minWidth: standingsStatsWidth(columns) + NAME_AND_PADDING_W,
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
            <StandingsStatCells
              columns={columns}
              header
              sort={sortable ? sorting.sort : null}
              onPressColumn={sortable ? sorting.pressColumn : undefined}
            />
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
                <StandingsStatCells columns={columns} line={row.line} />
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
      <ListPager
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
