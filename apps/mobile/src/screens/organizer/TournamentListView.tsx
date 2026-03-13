import { Pressable, RefreshControl, ScrollView, Text, View } from "react-native";

import { cardStyles, colors, radius, spacing, typography } from "../../theme";

import type { LiveTournamentState } from "./types";

interface TournamentListViewProps {
  tournaments: LiveTournamentState[];
  refreshing: boolean;
  errorText: string;
  onRefresh: () => void;
  onCreateNew: () => void;
  onOpenEstimator: () => void;
  onOpenTournament: (id: string) => void;
  onOpenOptions: (id: string) => void;
  onOpenProfile?: () => void;
}

export function TournamentListView(props: TournamentListViewProps) {
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
        <>
          {activeTournaments.map((tournament) => (
            <Pressable
              key={tournament.id}
              onPress={() => props.onOpenTournament(tournament.id)}
              style={[
                cardStyles.container,
                {
                  marginTop: spacing.sm,
                  backgroundColor: colors.surfaceAlt
                }
              ]}
            >
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: spacing.sm }}>
                <View>
                  <Text style={{ fontSize: 16, fontWeight: "700", color: colors.text }}>{tournament.config.name}</Text>
                  <Text style={{ fontSize: 12, color: colors.muted }}>
                    {tournament.config.mode} / {tournament.config.variant}
                  </Text>
                </View>
                <View
                  style={{
                    paddingHorizontal: spacing.sm,
                    paddingVertical: 4,
                    borderRadius: radius.pill,
                    backgroundColor: "rgba(173,255,47,0.12)"
                  }}
                >
                  <Text style={{ fontSize: 10, fontWeight: "700", color: colors.primary }}>LIVE</Text>
                </View>
              </View>
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: spacing.sm }}>
                <Text style={{ fontSize: 12, color: colors.muted }}>Players: {tournament.players.length}</Text>
                <Text style={{ fontSize: 12, color: colors.muted }}>
                  Updated: {new Date(tournament.updatedAt).toLocaleTimeString()}
                </Text>
              </View>
              <View style={{ flexDirection: "row" }}>
                <Pressable
                  onPress={() => props.onOpenOptions(tournament.id)}
                  style={{
                    paddingVertical: spacing.sm,
                    paddingHorizontal: spacing.lg,
                    borderRadius: radius.md,
                    backgroundColor: colors.surface,
                    borderWidth: 1,
                    borderColor: colors.border
                  }}
                >
                  <Text style={{ color: colors.text, fontWeight: "600" }}>Options</Text>
                </Pressable>
              </View>
            </Pressable>
          ))}
        </>
      )}

      {completedTournaments.length > 0 ? (
        <>
          <View
            style={{
              marginTop: spacing.lg,
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: spacing.sm
            }}
          >
            <Text style={{ fontSize: 16, fontWeight: "700", color: colors.text }}>History</Text>
          </View>
          {completedTournaments.map((tournament) => (
            <Pressable
              key={tournament.id}
              onPress={() => props.onOpenTournament(tournament.id)}
              style={[
                cardStyles.container,
                {
                  marginTop: spacing.sm,
                  backgroundColor: colors.surface
                }
              ]}
            >
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: spacing.sm }}>
                <View>
                  <Text style={{ fontSize: 16, fontWeight: "700", color: colors.text }}>{tournament.config.name}</Text>
                  <Text style={{ fontSize: 12, color: colors.muted }}>
                    {tournament.config.mode} / {tournament.config.variant}
                  </Text>
                </View>
                <View
                  style={{
                    paddingHorizontal: spacing.sm,
                    paddingVertical: 4,
                    borderRadius: radius.pill,
                    backgroundColor: colors.surfaceAlt
                  }}
                >
                  <Text style={{ fontSize: 10, fontWeight: "700", color: colors.muted }}>COMPLETED</Text>
                </View>
              </View>
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                <Text style={{ fontSize: 12, color: colors.muted }}>Players: {tournament.players.length}</Text>
                <Text style={{ fontSize: 12, color: colors.muted }}>
                  Updated: {new Date(tournament.updatedAt).toLocaleTimeString()}
                </Text>
              </View>
            </Pressable>
          ))}
        </>
      ) : null}

      {props.errorText ? <Text style={{ color: colors.danger }}>Error: {props.errorText}</Text> : null}

      <View
        style={{
          marginTop: spacing.lg,
          flexDirection: "row",
          gap: spacing.sm
        }}
      >
        <Pressable
          onPress={props.onCreateNew}
          style={{
            flex: 1,
            paddingVertical: spacing.sm,
            borderRadius: radius.md,
            backgroundColor: colors.primary,
            alignItems: "center",
            justifyContent: "center"
          }}
        >
          <Text
            style={{
              color: "#020617",
              fontWeight: "700"
            }}
          >
            Create New
          </Text>
        </Pressable>
        <Pressable
          onPress={props.onOpenEstimator}
          style={{
            flex: 1,
            paddingVertical: spacing.sm,
            borderRadius: radius.md,
            backgroundColor: colors.surface,
            borderWidth: 1,
            borderColor: colors.border,
            alignItems: "center",
            justifyContent: "center"
          }}
        >
          <Text
            style={{
              color: colors.text,
              fontWeight: "600"
            }}
          >
            Game Estimator
          </Text>
        </Pressable>
      </View>

      <View
        style={{
          marginTop: spacing.lg,
          paddingTop: spacing.sm,
          borderTopWidth: 1,
          borderTopColor: colors.border,
          flexDirection: "row",
          justifyContent: "space-between"
        }}
      >
        {["Home", "History", "Profile"].map((label, index) => (
          <View key={label} style={{ alignItems: "center", flex: 1 }}>
            <View
              style={{
                width: 6,
                height: 6,
                borderRadius: radius.pill,
                backgroundColor: index === 0 ? colors.primary : colors.muted,
                marginBottom: 4
              }}
            />
            <Text
              style={{
                fontSize: 10,
                fontWeight: "700",
                letterSpacing: 1,
                textTransform: "uppercase",
                color: index === 0 ? colors.primary : colors.muted
              }}
            >
              {label}
            </Text>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}
