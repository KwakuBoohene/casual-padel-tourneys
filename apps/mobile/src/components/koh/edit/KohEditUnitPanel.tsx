import { Pressable, Text, View } from "react-native";

import type { KohUnit } from "@padel/shared";
import { radius, spacing, touch, typography } from "../../../theme";
import { useTheme } from "../../../theme/ThemeProvider";
import { formatKohUnitLabel } from "../../../utilities/koh/rankingFormat";

import { KohEditUnitSheets } from "./KohEditUnitSheets";

interface KohEditUnitPanelProps {
  unit: KohUnit;
  role: string;
  midMatch: boolean;
  renamePlayerId: string | null;
  renameValue: string;
  onRenameValue: (value: string) => void;
  replacePlayerId: string | null;
  replaceName: string;
  onReplaceName: (value: string) => void;
  confirmReplace: boolean;
  leaveName: string;
  stayName: string;
  saving: boolean;
  errorText: string;
  onOpenRename: (playerId: string, name: string) => void;
  onOpenReplace: (playerId: string) => void;
  onDismissSubflow: () => void;
  onSubmitRename: () => void;
  onContinueReplace: () => void;
  onConfirmReplace: () => void;
  onBack: () => void;
}

function PartnerRow(props: {
  name: string;
  midMatch: boolean;
  onRename: () => void;
  onReplace: () => void;
}) {
  const { colors } = useTheme();
  return (
    <View
      style={{
        borderRadius: radius.lg,
        borderWidth: 1,
        borderColor: colors.border,
        padding: spacing.lg,
        gap: spacing.sm
      }}
    >
      <Text style={{ color: colors.text, fontWeight: "700", fontSize: 16 }}>{props.name}</Text>
      <View style={{ flexDirection: "row", gap: spacing.sm }}>
        <Pressable
          onPress={props.onRename}
          style={{
            flex: 1,
            minHeight: touch.minSecondary,
            borderRadius: radius.lg,
            borderWidth: 1,
            borderColor: colors.border,
            alignItems: "center",
            justifyContent: "center"
          }}
        >
          <Text style={{ color: colors.text, fontWeight: "600" }}>Rename</Text>
        </Pressable>
        <Pressable
          onPress={props.onReplace}
          disabled={props.midMatch}
          style={{
            flex: 1,
            minHeight: touch.minSecondary,
            borderRadius: radius.lg,
            borderWidth: 1,
            borderColor: colors.border,
            alignItems: "center",
            justifyContent: "center",
            opacity: props.midMatch ? 0.4 : 1
          }}
        >
          <Text style={{ color: colors.text, fontWeight: "600" }}>Replace</Text>
        </Pressable>
      </View>
    </View>
  );
}

export function KohEditUnitPanel(props: KohEditUnitPanelProps) {
  const { colors } = useTheme();
  const unit = props.unit;
  const wl = `${unit.matchesWon ?? 0}-${unit.matchesLost ?? 0}`;

  return (
    <View style={{ flex: 1, backgroundColor: colors.background, padding: spacing.xl, gap: spacing.md }}>
      <Text style={[typography.title, { color: colors.text }]}>Edit unit</Text>
      <Text style={{ color: colors.muted }}>
        {formatKohUnitLabel(unit.playerAName, unit.playerBName)} · {props.role} · {wl}
      </Text>
      {props.midMatch ? (
        <Text style={{ color: colors.danger }}>
          Blocked mid-match. Wait until the score is saved, same as swap.
        </Text>
      ) : null}
      {props.errorText ? <Text style={{ color: colors.danger }}>{props.errorText}</Text> : null}
      <PartnerRow
        name={unit.playerAName}
        midMatch={props.midMatch}
        onRename={() => props.onOpenRename(unit.playerAId, unit.playerAName)}
        onReplace={() => props.onOpenReplace(unit.playerAId)}
      />
      <PartnerRow
        name={unit.playerBName}
        midMatch={props.midMatch}
        onRename={() => props.onOpenRename(unit.playerBId, unit.playerBName)}
        onReplace={() => props.onOpenReplace(unit.playerBId)}
      />
      <Pressable onPress={props.onBack} style={{ alignItems: "center", paddingVertical: spacing.md }}>
        <Text style={{ color: colors.muted, fontWeight: "600" }}>Back</Text>
      </Pressable>
      <KohEditUnitSheets
        renamePlayerId={props.renamePlayerId}
        renameValue={props.renameValue}
        onRenameValue={props.onRenameValue}
        replacePlayerId={props.replacePlayerId}
        replaceName={props.replaceName}
        onReplaceName={props.onReplaceName}
        confirmReplace={props.confirmReplace}
        leaveName={props.leaveName}
        stayName={props.stayName}
        role={props.role}
        record={wl}
        saving={props.saving}
        onDismissSubflow={props.onDismissSubflow}
        onSubmitRename={props.onSubmitRename}
        onContinueReplace={props.onContinueReplace}
        onConfirmReplace={props.onConfirmReplace}
      />
    </View>
  );
}
