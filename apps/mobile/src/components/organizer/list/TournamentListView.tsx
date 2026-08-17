import { FlashList } from "@shopify/flash-list";
import { RefreshControl, Text, View } from "react-native";

import { useBreakpoint } from "../../../layout";
import { spacing } from "../../../theme";
import { useTheme } from "../../../theme/ThemeProvider";

import type { LiveTournamentState } from "../../../types/organizer/tournament";

import { TournamentListCard } from "./TournamentListCard";
import { TournamentListCreateActions } from "./TournamentListCreateActions";
import { TournamentListHeader } from "./TournamentListHeader";

interface TournamentListViewProps {
  tournaments: LiveTournamentState[];
  refreshing: boolean;
  errorText: string;
  onRefresh: () => void;
  onCreateAmericano: () => void;
  onCreateMexicano: () => void;
  onCreateKingOfTheHill: () => void;
  onOpenEstimator: () => void;
  onOpenTournament: (id: string) => void;
  onOpenOptions: (id: string) => void;
  onOpenProfile?: () => void;
  onOpenAccountPlayers?: () => void;
}

type TournamentListRow = {
  id: string;
  tournament: LiveTournamentState;
  status: "LIVE" | "COMPLETED";
};

function isActiveTournament(tournament: LiveTournamentState): boolean {
  if (tournament.config.mode === "KING_OF_THE_COURT") return !tournament.endedAt;
  if (tournament.config.mode === "MEXICANO") return !tournament.endedAt;
  return !tournament.rounds.every((round) => round.matches.every((match) => match.completed));
}

export function TournamentListView(props: TournamentListViewProps) {
  const { colors } = useTheme();
  const { formMaxWidth } = useBreakpoint();

  const rows: TournamentListRow[] = [
    ...props.tournaments.filter(isActiveTournament).map((tournament) => ({
      id: tournament.id,
      tournament,
      status: "LIVE" as const
    })),
    ...props.tournaments.filter((tournament) => !isActiveTournament(tournament)).map((tournament) => ({
      id: tournament.id,
      tournament,
      status: "COMPLETED" as const
    }))
  ];

  return (
    <FlashList
      data={rows}
      keyExtractor={(item) => item.id}
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
            onCreateKingOfTheHill={props.onCreateKingOfTheHill}
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
      ListFooterComponent={
        props.errorText ? (
          <Text style={{ color: colors.danger, marginTop: spacing.md }}>Error: {props.errorText}</Text>
        ) : null
      }
      ItemSeparatorComponent={() => <View style={{ height: spacing.sm }} />}
      renderItem={({ item }) => (
        <TournamentListCard
          tournament={item.tournament}
          status={item.status}
          onOpen={() => props.onOpenTournament(item.tournament.id)}
          onOpenOptions={() => props.onOpenOptions(item.tournament.id)}
        />
      )}
    />
  );
}
