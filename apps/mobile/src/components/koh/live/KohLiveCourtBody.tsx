import { Pressable, ScrollView, Text, View } from "react-native";

import type { KohTournamentHub } from "../../../types/koh/create";
import { spacing, typography } from "../../../theme";
import { useTheme } from "../../../theme/ThemeProvider";

import { KohLiveActions } from "./KohLiveActions";
import { KohLiveCourtPager, KohLiveUnitCard } from "./KohLiveCourtBits";

type LiveCourt = KohTournamentHub["courts"][number];

interface KohLiveCourtBodyProps {
  name: string;
  ended: boolean;
  errorText: string;
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
}

export function KohLiveCourtBody(props: KohLiveCourtBodyProps) {
  const { colors } = useTheme();
  const court = props.court;

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
          KOH · Winner-stays{props.ended ? " · Ended" : ""}
        </Text>
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
        {(court?.waiting ?? []).map((unit) => (
          <KohLiveUnitCard key={unit.id} label="WAIT" unit={unit} />
        ))}
        {props.errorText ? <Text style={{ color: colors.danger }}>{props.errorText}</Text> : null}
      </ScrollView>
      <View style={{ paddingHorizontal: spacing.xl }}>
        <KohLiveActions
          canEnterResult={props.canEnterResult}
          ended={props.ended}
          onEnterResult={props.onEnterResult}
          onSwap={props.onSwap}
          onRename={props.onRename}
          onShare={props.onShare}
          onRank={props.onRank}
          onEnd={props.onEnd}
          onHome={props.onHome}
        />
      </View>
    </View>
  );
}
