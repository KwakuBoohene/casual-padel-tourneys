import { Pressable, ScrollView, Text, TextInput } from "react-native";

import { BottomSheet, SheetButton } from "../../sheets";
import { radius, spacing, touch } from "../../../theme";
import { useTheme } from "../../../theme/ThemeProvider";
import { formatKohUnitLabel } from "../../../utilities/koh/rankingFormat";
import type { EligibleReplacePartner } from "../../../utilities/koh/eligibleReplacePartners";

interface KohReplacePartnerSheetProps {
  visible: boolean;
  confirm: boolean;
  leaveName: string;
  stayName: string;
  joinName: string;
  role: string;
  record: string;
  saving: boolean;
  addingNew: boolean;
  replaceName: string;
  selectedReplacementId: string | null;
  partners: EligibleReplacePartner[];
  onReplaceName: (value: string) => void;
  onSelectReplacement: (playerId: string) => void;
  onToggleAddingNew: () => void;
  onDismiss: () => void;
  onContinue: () => void;
  onConfirm: () => void;
}

export function KohReplacePartnerSheet(props: KohReplacePartnerSheetProps) {
  const { colors } = useTheme();
  const sameCourt = props.partners.filter((row) => row.sameCourt);
  const otherCourts = props.partners.filter((row) => !row.sameCourt);
  const canContinue = props.addingNew
    ? props.replaceName.trim().length > 0
    : Boolean(props.selectedReplacementId);

  return (
    <>
      <BottomSheet
        visible={props.visible && !props.confirm}
        title={`Replace ${props.leaveName}`}
        onDismiss={props.onDismiss}
      >
        <Text style={{ color: colors.muted, fontSize: 13 }}>
          Pick someone already in this King of the Court event, or add a new player.
        </Text>
        <ScrollView style={{ maxHeight: 280 }} contentContainerStyle={{ gap: spacing.sm }}>
          {sameCourt.length > 0 ? (
            <Text style={{ color: colors.muted, fontSize: 12, fontWeight: "700" }}>This court</Text>
          ) : null}
          {sameCourt.map((row) => (
            <PartnerPickRow
              key={row.playerId}
              row={row}
              selected={props.selectedReplacementId === row.playerId}
              disabled={props.saving}
              onPress={() => props.onSelectReplacement(row.playerId)}
            />
          ))}
          {otherCourts.length > 0 ? (
            <Text style={{ color: colors.muted, fontSize: 12, fontWeight: "700" }}>Other courts</Text>
          ) : null}
          {otherCourts.map((row) => (
            <PartnerPickRow
              key={row.playerId}
              row={row}
              selected={props.selectedReplacementId === row.playerId}
              disabled={props.saving}
              onPress={() => props.onSelectReplacement(row.playerId)}
            />
          ))}
        </ScrollView>
        <Pressable onPress={props.onToggleAddingNew}>
          <Text style={{ color: colors.primary, fontWeight: "600" }}>
            {props.addingNew ? "Pick from list" : "Add new player"}
          </Text>
        </Pressable>
        {props.addingNew ? (
          <TextInput
            value={props.replaceName}
            onChangeText={props.onReplaceName}
            placeholder="New partner name"
            placeholderTextColor={colors.muted}
            style={{
              borderWidth: 1,
              borderColor: colors.border,
              borderRadius: radius.lg,
              padding: spacing.md,
              color: colors.text,
              minHeight: touch.minSecondary
            }}
          />
        ) : null}
        <SheetButton label="Continue" disabled={!canContinue} onPress={props.onContinue} />
      </BottomSheet>

      <BottomSheet visible={props.visible && props.confirm} title="Confirm replace" onDismiss={props.onDismiss}>
        <Text style={{ color: colors.text, lineHeight: 22 }}>
          {props.leaveName} leaves · {props.joinName} joins. Unit becomes{" "}
          {formatKohUnitLabel(props.stayName, props.joinName)}. Keeps {props.role} slot · match record{" "}
          {props.record}.
        </Text>
        <Text style={{ color: colors.muted, lineHeight: 20 }}>
          Past games stay on {props.leaveName}. Future games credit {props.joinName}.
        </Text>
        <SheetButton
          label={props.saving ? "Replacing…" : "Confirm replace"}
          variant="primary"
          disabled={props.saving}
          onPress={props.onConfirm}
        />
        <SheetButton label="Cancel" onPress={props.onDismiss} />
      </BottomSheet>
    </>
  );
}

function PartnerPickRow(props: {
  row: EligibleReplacePartner;
  selected: boolean;
  disabled: boolean;
  onPress: () => void;
}) {
  const { colors } = useTheme();
  return (
    <Pressable
      onPress={props.onPress}
      disabled={props.disabled}
      style={{
        minHeight: touch.minSecondary,
        borderRadius: radius.lg,
        borderWidth: props.selected ? 2 : 1,
        borderColor: props.selected ? colors.primary : colors.border,
        padding: spacing.md,
        opacity: props.disabled ? 0.5 : 1
      }}
    >
      <Text style={{ color: colors.text, fontWeight: "600" }} numberOfLines={1}>
        {props.row.name}
      </Text>
      <Text style={{ color: colors.muted, fontSize: 12 }} numberOfLines={1}>
        Court {props.row.courtNumber} · with {props.row.partnerName}
      </Text>
    </Pressable>
  );
}
