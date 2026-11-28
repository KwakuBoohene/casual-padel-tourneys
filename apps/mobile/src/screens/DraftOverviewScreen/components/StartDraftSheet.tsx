import { Text, View } from "react-native";

import { BottomSheet, SheetButton } from "../../../components/sheets";
import { radius, spacing } from "../../../theme";
import { useTheme } from "../../../theme/ThemeProvider";
import type { DraftStartSummary } from "../../../utilities/organizer/draftStart";

export interface StartDraftSheetProps {
  visible: boolean;
  busy: boolean;
  error: string | null;
  name: string;
  summary: DraftStartSummary;
  accessLine: string | null;
  onConfirm: () => void;
  onCancel: () => void;
}

function Stat({ label, value }: { label: string; value: string }) {
  const { colors } = useTheme();
  return (
    <View style={{ flex: 1, alignItems: "center", gap: 2 }}>
      <Text style={{ fontSize: 18, fontWeight: "700", color: colors.text }}>{value}</Text>
      <Text style={{ fontSize: 12, color: colors.muted }}>{label}</Text>
    </View>
  );
}

/** "Start Friday Social?" confirmation (Figma 08 · `3:244`). */
export function StartDraftSheet(props: StartDraftSheetProps) {
  const { colors } = useTheme();
  const { estimate, approximate } = props.summary;
  const around = approximate ? "~" : "";
  return (
    <BottomSheet visible={props.visible} title={`Start ${props.name}?`} onDismiss={props.onCancel} busy={props.busy}>
      <View style={{ gap: spacing.md }}>
        <View
          style={{ flexDirection: "row", borderRadius: radius.md, backgroundColor: colors.background, paddingVertical: spacing.md }}
        >
          <Stat label="players" value={String(props.summary.players)} />
          <Stat label="courts" value={props.summary.courts ? String(props.summary.courts) : "–"} />
          {estimate ? <Stat label="rounds" value={`${around}${estimate.rounds}`} /> : null}
          {estimate ? <Stat label="minutes" value={`${around}${estimate.durationMinutes}`} /> : null}
        </View>
        {estimate ? (
          <Text style={{ fontSize: 14, color: colors.muted }}>
            About {estimate.gamesPerPlayer} {estimate.gamesPerPlayer === 1 ? "match" : "matches"} per player.
          </Text>
        ) : null}
        <Text style={{ fontSize: 14, color: colors.text }}>
          The first round is drawn now and the tournament goes live with a share link for players. The draft closes.
        </Text>
        {props.accessLine ? <Text style={{ fontSize: 14, color: colors.muted }}>{props.accessLine}</Text> : null}
        {props.error ? <Text style={{ fontSize: 13, color: colors.danger }}>{props.error}</Text> : null}
        <SheetButton
          label={props.busy ? "Starting…" : "Start now"}
          variant="primary"
          disabled={props.busy}
          onPress={props.onConfirm}
        />
        <SheetButton label="Not yet" disabled={props.busy} onPress={props.onCancel} />
      </View>
    </BottomSheet>
  );
}
