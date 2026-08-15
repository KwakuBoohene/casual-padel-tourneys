import { RefreshControl, ScrollView, Text, View } from "react-native";

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
}

export function TournamentListView(props: TournamentListViewProps) {
  const { colors } = useTheme();
  const { isWide } = useBreakpoint();
  const cardWrapStyle = isWide
    ? ({ flexDirection: "row", flexWrap: "wrap", gap: spacing.md } as const)
    : undefined;
  const wideCardStyle = isWide
    ? ({ flexGrow: 1, flexBasis: "47%", minWidth: 260, maxWidth: 520 } as const)
    : undefined;

  const activeTournaments = props.tournaments.filter((tournament) => {
    if (tournament.config.mode === "KING_OF_THE_HILL") return true;
    return !tournament.rounds.every((round) => round.matches.every((match) => match.completed));
  });
  const completedTournaments = props.tournaments.filter((tournament) => {
    if (tournament.config.mode === "KING_OF_THE_HILL") return false;
    return tournament.rounds.every((round) => round.matches.every((match) => match.completed));
  });
  const hasAny = props.tournaments.length > 0;

  return (
    <ScrollView
      contentContainerStyle={{
        paddingHorizontal: spacing.xl,
        paddingTop: spacing.xxl,
        paddingBottom: spacing.xl,
        gap: spacing.md,
        backgroundColor: colors.background,
        flexGrow: 1
      }}
      refreshControl={<RefreshControl refreshing={props.refreshing} onRefresh={props.onRefresh} />}
    >
      <TournamentListHeader onOpenProfile={props.onOpenProfile} />

      <TournamentListCreateActions
        onCreateAmericano={props.onCreateAmericano}
        onCreateMexicano={props.onCreateMexicano}
        onCreateKingOfTheHill={props.onCreateKingOfTheHill}
        onOpenEstimator={props.onOpenEstimator}
      />

      {!hasAny ? (
        <View style={{ gap: spacing.xs, marginTop: spacing.sm }}>
          <Text style={{ color: colors.text, fontSize: 18, fontWeight: "700" }}>No tournaments yet</Text>
          <Text style={{ color: colors.muted, fontSize: 14 }}>
            Start with Americano, Mexicano, or King of the Hill.
          </Text>
        </View>
      ) : (
        <View style={{ gap: spacing.sm, marginTop: spacing.sm }}>
          {activeTournaments.length > 0 ? (
            <View style={cardWrapStyle}>
              {activeTournaments.map((tournament) => (
                <TournamentListCard
                  key={tournament.id}
                  tournament={tournament}
                  status="LIVE"
                  wideCardStyle={wideCardStyle}
                  onOpen={() => props.onOpenTournament(tournament.id)}
                  onOpenOptions={() => props.onOpenOptions(tournament.id)}
                />
              ))}
            </View>
          ) : null}
          {completedTournaments.length > 0 ? (
            <View style={[cardWrapStyle, { marginTop: activeTournaments.length ? spacing.sm : 0 }]}>
              {completedTournaments.map((tournament) => (
                <TournamentListCard
                  key={tournament.id}
                  tournament={tournament}
                  status="COMPLETED"
                  wideCardStyle={wideCardStyle}
                  onOpen={() => props.onOpenTournament(tournament.id)}
                  onOpenOptions={() => props.onOpenOptions(tournament.id)}
                />
              ))}
            </View>
          ) : null}
        </View>
      )}

      {props.errorText ? <Text style={{ color: colors.danger }}>Error: {props.errorText}</Text> : null}
    </ScrollView>
  );
}
