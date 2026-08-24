import { Pressable, ScrollView, Text, View } from "react-native";
import {
  standingsLineFromRecord,
  type OrganizerPlayerLeaderboardRow,
  type OrganizerPlayerRange
} from "@padel/shared";

import { radius, spacing, touch } from "../../theme";
import { useTheme } from "../../theme/ThemeProvider";
import { StandingsTable } from "../standings/StandingsTable";
import { ExportSheet } from "../exports/ExportSheet";
import { useLeaderboardExport } from "../../hooks/exports/useLeaderboardExport";
import { CareerShareSheet } from "./CareerShareSheet";
import { useCareerShare } from "../../hooks/accountPlayers/useCareerShare";
import { AccountPlayersHeader } from "./AccountPlayersHeader";

interface AccountPlayersPanelProps {
  /** Base URL of the public viewer, for the share link. */
  viewerBaseUrl: string;
  range: OrganizerPlayerRange;
  onRange: (range: OrganizerPlayerRange) => void;
  rows: OrganizerPlayerLeaderboardRow[];
  loading: boolean;
  guestMessage: string | null;
  onSelect: (id: string) => void;
  onBack: () => void;
  onAttach?: () => void;
}

export function AccountPlayersPanel(props: AccountPlayersPanelProps) {
  const { colors } = useTheme();
  const exportState = useLeaderboardExport({
    displayName: "account",
    range: props.range
  });
  const shareState = useCareerShare();
  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView contentContainerStyle={{ padding: spacing.xl, gap: spacing.md, paddingBottom: spacing.xxl }}>
        <AccountPlayersHeader
          range={props.range}
          onRange={props.onRange}
          showActions={!props.guestMessage}
          onShare={shareState.open}
          onExport={exportState.open}
        />
        {props.guestMessage ? (
          <View
            style={{
              borderRadius: radius.lg,
              borderWidth: 1,
              borderColor: colors.border,
              padding: spacing.lg,
              gap: spacing.sm
            }}
          >
            <Text style={{ color: colors.text, lineHeight: 20 }}>{props.guestMessage}</Text>
            {props.onAttach ? (
              <Pressable
                onPress={props.onAttach}
                style={{
                  minHeight: touch.minSecondary,
                  borderRadius: radius.lg,
                  backgroundColor: colors.primary,
                  alignItems: "center",
                  justifyContent: "center"
                }}
              >
                <Text style={{ color: colors.onPrimary, fontWeight: "700" }}>Attach account</Text>
              </Pressable>
            ) : null}
          </View>
        ) : null}
        {props.loading ? <Text style={{ color: colors.muted }}>Loading…</Text> : null}
        {!props.loading && !props.guestMessage && props.rows.length === 0 ? (
          <Text style={{ color: colors.muted }}>No scored matches yet in this range.</Text>
        ) : null}
        {props.rows.length > 0 ? (
          <StandingsTable
            rows={props.rows.map((row) => ({
              id: row.id,
              rank: row.rank,
              name: row.name,
              line: standingsLineFromRecord({
                wins: row.matchesWon,
                losses: row.matchesLost,
                draws: row.matchesDrawn,
                gamesWon: row.gamesWon,
                gamesLost: row.gamesLost,
                americanoPointsWon: row.americanoPointsWon,
                americanoPointsLost: row.americanoPointsLost
              })
            }))}
            onSelect={props.onSelect}
          />
        ) : null}
      </ScrollView>
      <ExportSheet
        visible={exportState.visible}
        choices={[
          { dataset: "careerLeaderboard", scope: "leaderboard", label: "Leaderboard only" },
          { dataset: "careerLeaderboard", scope: "full", label: "Leaderboard + tournaments" },
          { dataset: "careerMatches", label: "All matches" }
        ]}
        range={props.range}
        exporting={exportState.exporting}
        error={exportState.error}
        onExport={exportState.run}
        onDismiss={exportState.close}
      />
      <CareerShareSheet
        visible={shareState.visible}
        viewerBaseUrl={props.viewerBaseUrl}
        token={shareState.token}
        busy={shareState.busy}
        error={shareState.error}
        copied={shareState.copied}
        onEnable={shareState.enable}
        onRotate={shareState.rotate}
        onRevoke={shareState.revoke}
        onCopied={shareState.markCopied}
        onDismiss={shareState.close}
      />
      <Pressable
        onPress={props.onBack}
        style={{ alignItems: "center", padding: spacing.xl, minHeight: touch.minSecondary }}
      >
        <Text style={{ color: colors.muted, fontWeight: "600" }}>Back</Text>
      </Pressable>
    </View>
  );
}
