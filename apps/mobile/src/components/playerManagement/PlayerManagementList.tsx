import { Text, View } from "react-native";
import type { OrganizerManagedPlayer, OrganizerPlayerStatus } from "@padel/shared";

import { usePagedSlice } from "../../hooks/standings/usePagedSlice";
import { useBreakpoint } from "../../layout";
import { spacing } from "../../theme";
import { useTheme } from "../../theme/ThemeProvider";
import { playerListPageSize } from "../../utilities/accountPlayers/playerListPaging";
import { ListPager } from "../lists/ListPager";

import { PlayerManagementRow } from "./PlayerManagementRow";

export function PlayerManagementList(props: {
  players: OrganizerManagedPlayer[];
  status: OrganizerPlayerStatus;
  loading: boolean;
  onRename: (player: OrganizerManagedPlayer) => void;
  onAction: (player: OrganizerManagedPlayer) => void;
}) {
  const { colors } = useTheme();
  const { width, height } = useBreakpoint();
  const pageSize = playerListPageSize(width, height);
  const pages = usePagedSlice(props.players.length, pageSize);
  const visible = props.players.slice(pages.pageStart, pages.pageEnd);

  if (props.loading) return <Text style={{ color: colors.muted }}>Loading…</Text>;
  if (props.players.length === 0) {
    return (
      <Text style={{ color: colors.muted }}>
        {props.status === "archived" ? "No archived players." : "No players yet."}
      </Text>
    );
  }

  return (
    <View style={{ gap: spacing.md }}>
      {visible.map((player) => (
        <PlayerManagementRow
          key={player.id}
          player={player}
          status={props.status}
          onRename={() => props.onRename(player)}
          onAction={() => props.onAction(player)}
        />
      ))}
      <ListPager
        total={props.players.length}
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
