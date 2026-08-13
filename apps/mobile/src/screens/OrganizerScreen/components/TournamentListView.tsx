import { Pressable, RefreshControl, ScrollView, Text, View } from "react-native";

import { useBreakpoint } from "../../../layout";
import { radius, spacing, typography } from "../../../theme";
import { ThemeToggle } from "../../../components/ThemeToggle";
import { useTheme } from "../../../theme/ThemeProvider";

import type { LiveTournamentState } from "../types";

import { TournamentListBottomNav } from "./TournamentListBottomNav";
import { TournamentListCard } from "./TournamentListCard";
import { TournamentListCreateActions } from "./TournamentListCreateActions";

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
  const { colors, cardStyles } = useTheme();
  const { isWide } = useBreakpoint();
  const cardWrapStyle = isWide
    ? ({ flexDirection: "row", flexWrap: "wrap", gap: spacing.md } as const)
    : undefined;
  const wideCardStyle = isWide
    ? ({ flexGrow: 1, flexBasis: "47%", minWidth: 260, maxWidth: 520 } as const)
    : undefined;

  const activeTournaments = props.tournaments.filter(
    (tournament) => !tournament.rounds.every((round) => round.matches.every((match) => match.completed))
  );
  const completedTournaments = props.tournaments.filter(
    (tournament) => tournament.rounds.every((round) => round.matches.every((match) => match.completed))
  );

  return (
    <ScrollView
      contentContainerStyle={{ padding: spacing.lg, gap: spacing.md, backgroundColor: colors.background }}
      refreshControl={<RefreshControl refreshing={props.refreshing} onRefresh={props.onRefresh} />}
    >
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: spacing.sm }}>
        <View>
          <Text style={[typography.title, { color: colors.text }]}>Dashboard</Text>
          <Text style={{ fontSize: 12, color: colors.muted }}>Welcome back, Pro Organizer</Text>
        </View>
        <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.sm }}>
          <ThemeToggle compact />
          <Pressable
            onPress={props.onOpenProfile}
            style={{
              width: 36,
              height: 36,
              borderRadius: radius.pill,
              borderWidth: 2,
              borderColor: colors.primary,
              alignItems: "center",
              justifyContent: "center"
            }}
          >
            <Text style={{ color: colors.primary, fontWeight: "700", fontSize: 12 }}>Me</Text>
          </Pressable>
        </View>
      </View>

      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: spacing.sm }}>
        <Text style={{ fontSize: 16, fontWeight: "700", color: colors.text }}>Active Tournaments</Text>
        <Pressable onPress={props.onRefresh}>
          <Text style={{ fontSize: 12, fontWeight: "600", color: colors.primary }}>Refresh</Text>
        </Pressable>
      </View>

      {activeTournaments.length === 0 ? (
        <View style={[cardStyles.container, { marginTop: spacing.sm }]}>
          <Text style={{ color: colors.muted, fontSize: 14 }}>No active tournaments.</Text>
        </View>
      ) : (
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
      )}

      {completedTournaments.length > 0 ? (
        <>
          <View style={{ marginTop: spacing.lg, marginBottom: spacing.sm }}>
            <Text style={{ fontSize: 16, fontWeight: "700", color: colors.text }}>History</Text>
          </View>
          <View style={cardWrapStyle}>
            {completedTournaments.map((tournament) => (
              <TournamentListCard
                key={tournament.id}
                tournament={tournament}
                status="COMPLETED"
                wideCardStyle={wideCardStyle}
                onOpen={() => props.onOpenTournament(tournament.id)}
              />
            ))}
          </View>
        </>
      ) : null}

      {props.errorText ? <Text style={{ color: colors.danger }}>Error: {props.errorText}</Text> : null}

      <TournamentListCreateActions
        onCreateAmericano={props.onCreateAmericano}
        onCreateMexicano={props.onCreateMexicano}
        onCreateKingOfTheHill={props.onCreateKingOfTheHill}
        onOpenEstimator={props.onOpenEstimator}
      />

      <TournamentListBottomNav />
    </ScrollView>
  );
}
