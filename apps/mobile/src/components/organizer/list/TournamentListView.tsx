import { FlashList } from "@shopify/flash-list";
import { RefreshControl, Text, View } from "react-native";
import type { TournamentDraftSummary } from "@padel/shared";

import { useBreakpoint } from "../../../layout";
import { spacing, typography } from "../../../theme";
import { useTheme } from "../../../theme/ThemeProvider";

import type { LiveTournamentState } from "../../../types/organizer/tournament";
import { buildTournamentListRows } from "../../../utilities/organizer/tournamentListRows";

import { DraftListCard } from "./DraftListCard";
import { TournamentListCard } from "./TournamentListCard";
import { TournamentListCreateActions } from "./TournamentListCreateActions";
import { TournamentListHeader } from "./TournamentListHeader";

/** Draft rows above the tournaments; omitted while drafts haven't loaded. */
export interface DraftListSection {
  own: TournamentDraftSummary[];
  shared: TournamentDraftSummary[];
  onOpen: (draft: TournamentDraftSummary) => void;
  onOpenOptions: (draft: TournamentDraftSummary) => void;
}

interface TournamentListViewProps {
  tournaments: LiveTournamentState[];
  drafts?: DraftListSection;
  refreshing: boolean;
  onRefresh: () => void;
  onCreateAmericano: () => void;
  onCreateMexicano: () => void;
  onCreateKingOfTheCourt: () => void;
  onOpenEstimator: () => void;
  onOpenTournament: (id: string) => void;
  onOpenOptions: (id: string) => void;
  onOpenProfile?: () => void;
  onOpenAccountPlayers?: () => void;
}

export function TournamentListView(props: TournamentListViewProps) {
  const { colors } = useTheme();
  const { formMaxWidth } = useBreakpoint();
  const rows = buildTournamentListRows({
    tournaments: props.tournaments,
    ownDrafts: props.drafts?.own ?? [],
    sharedDrafts: props.drafts?.shared ?? []
  });

  return (
    <FlashList
      data={rows}
      keyExtractor={(item) => item.id}
      getItemType={(item) => item.type}
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{
        paddingHorizontal: spacing.xl,
        paddingTop: spacing.xxl,
        paddingBottom: spacing.xl,
        maxWidth: formMaxWidth,
        width: "100%",
        alignSelf: "center",
        flexGrow: 1
      }}
      refreshControl={<RefreshControl refreshing={props.refreshing} onRefresh={props.onRefresh} />}
      ListHeaderComponent={
        <View style={{ gap: spacing.md, marginBottom: spacing.sm }}>
          <TournamentListHeader onOpenProfile={props.onOpenProfile} />
          <TournamentListCreateActions
            onCreateAmericano={props.onCreateAmericano}
            onCreateMexicano={props.onCreateMexicano}
            onCreateKingOfTheCourt={props.onCreateKingOfTheCourt}
            onOpenEstimator={props.onOpenEstimator}
            onOpenAccountPlayers={props.onOpenAccountPlayers}
          />
        </View>
      }
      ListEmptyComponent={
        <View style={{ gap: spacing.xs, marginTop: spacing.sm }}>
          <Text style={{ color: colors.text, fontSize: 18, fontWeight: "700" }}>No tournaments yet</Text>
          <Text style={{ color: colors.muted, fontSize: 14 }}>
            Start with Americano, Mexicano, or King of the Court.
          </Text>
        </View>
      }
      ItemSeparatorComponent={() => <View style={{ height: spacing.sm }} />}
      renderItem={({ item }) => {
        if (item.type === "label") {
          return (
            <Text style={[typography.label, { color: colors.muted, marginTop: spacing.sm }]} accessibilityRole="header">
              {item.label}
            </Text>
          );
        }
        if (item.type === "draft") {
          return (
            <DraftListCard
              draft={item.draft}
              onOpen={() => props.drafts?.onOpen(item.draft)}
              onOpenOptions={() => props.drafts?.onOpenOptions(item.draft)}
            />
          );
        }
        return (
          <TournamentListCard
            tournament={item.tournament}
            status={item.status}
            onOpen={() => props.onOpenTournament(item.tournament.id)}
            onOpenOptions={() => props.onOpenOptions(item.tournament.id)}
          />
        );
      }}
    />
  );
}
