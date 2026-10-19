import { useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";

import type { KohTournamentHub } from "../../../types/koh/create";
import { spacing, typography } from "../../../theme";
import { useTheme } from "../../../theme/ThemeProvider";
import { buildKohConfigRows } from "../../../utilities/organizer/tournamentConfigSummary";
import { TournamentConfigSummaryPanel } from "../../organizer/TournamentConfigSummaryPanel";

import { KohLiveActions } from "./KohLiveActions";
import { KohLiveOptionsSheet } from "./KohLiveOptionsSheet";
import { KohLiveCourtPager, KohLiveUnitCard } from "./KohLiveCourtBits";
import { KohLiveWaitingQueue } from "./KohLiveWaitingQueue";

type LiveCourt = KohTournamentHub["courts"][number];

interface KohLiveCourtBodyProps {
  name: string;
  config: KohTournamentHub["config"];
  ended: boolean;
  court: LiveCourt | undefined;
  courtCount: number;
  courtIndex: number;
  canEnterResult: boolean;
  onSelectCourt: (index: number) => void;
  onHome: () => void;
  onEnterResult: () => void;
  onSwap: () => void;
  onRename: () => void;
  onShare: () => void;
  onRank: () => void;
  onEnd: () => void;
  contributeToCareerLeaderboard: boolean;
  careerSaving: boolean;
  onSetContributeToCareerLeaderboard: (value: boolean) => void;
}

export function KohLiveCourtBody(props: KohLiveCourtBodyProps) {
  const { colors } = useTheme();
  const [optionsOpen, setOptionsOpen] = useState(false);
  const court = props.court;

  const pairingLabel =
    props.config.pairingMode === "ROUND_ROBIN_PAIRS" ? "Round-robin pairs" : "Winner stays";

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView
        contentContainerStyle={{ padding: spacing.xl, gap: spacing.md, paddingBottom: spacing.sm }}
      >
        <Pressable onPress={props.onHome} hitSlop={8}>
          <Text style={{ color: colors.primary, fontWeight: "500", fontSize: 14 }}>← Home</Text>
        </Pressable>
        <Text style={[typography.title, { color: colors.text }]}>{props.name}</Text>
        <Text style={{ color: colors.primary, fontWeight: "600" }}>
          King of the Court · {pairingLabel}
          {props.ended ? " · Ended" : ""}
        </Text>
        <TournamentConfigSummaryPanel rows={buildKohConfigRows(props.config)} />
        <KohLiveCourtPager
          courtCount={props.courtCount}
          courtIndex={props.courtIndex}
          onSelect={props.onSelectCourt}
        />
        {court?.king ? <KohLiveUnitCard label="KING" unit={court.king} emphasized /> : null}
        {court?.king && court?.challenger ? (
          <Text style={{ color: colors.muted, textAlign: "center", fontWeight: "600" }}>vs</Text>
        ) : null}
        {court?.challenger ? <KohLiveUnitCard label="CHALLENGER" unit={court.challenger} /> : null}
        <KohLiveWaitingQueue units={court?.waiting ?? []} />
      </ScrollView>
      <View style={{ paddingHorizontal: spacing.xl }}>
        <KohLiveActions
          canEnterResult={props.canEnterResult}
          ended={props.ended}
          onEnterResult={props.onEnterResult}
          onSwap={props.onSwap}
          onShare={props.onShare}
          onOpenOptions={() => setOptionsOpen(true)}
        />
      </View>
      <KohLiveOptionsSheet
        visible={optionsOpen}
        ended={props.ended}
        onClose={() => setOptionsOpen(false)}
        onRank={props.onRank}
        onRename={props.onRename}
        onEnd={props.onEnd}
        onHome={props.onHome}
        contributeToCareerLeaderboard={props.contributeToCareerLeaderboard}
        careerSaving={props.careerSaving}
        onSetContributeToCareerLeaderboard={props.onSetContributeToCareerLeaderboard}
      />
    </View>
  );
}
