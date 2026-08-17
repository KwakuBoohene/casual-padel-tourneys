import { Pressable, ScrollView, Text, View } from "react-native";
import type { OrganizerManagedPlayer, OrganizerPlayerStatus } from "@padel/shared";

import { spacing, touch, typography } from "../../theme";
import { useTheme } from "../../theme/ThemeProvider";

import { MergeConfirmSheet } from "./MergeConfirmSheet";
import { PlayerManagementList } from "./PlayerManagementList";
import { ArchiveConfirmSheet, MergePickSheet, UnarchiveConfirmSheet } from "./PlayerManagementSheets";
import { PlayerStatusTabs } from "./PlayerManagementRow";
import { RenamePlayerSheet } from "./RenamePlayerSheet";

interface PlayerManagementPanelProps {
  status: OrganizerPlayerStatus;
  onStatus: (status: OrganizerPlayerStatus) => void;
  players: OrganizerManagedPlayer[];
  loading: boolean;
  guestMessage: string | null;
  pending: OrganizerManagedPlayer | null;
  onPending: (player: OrganizerManagedPlayer | null) => void;
  onConfirmArchive: () => void;
  onConfirmUnarchive: () => void;
  renaming: OrganizerManagedPlayer | null;
  onRenaming: (player: OrganizerManagedPlayer | null) => void;
  onConfirmRename: (name: string) => void;
  onBack: () => void;
  onAttach?: () => void;
  merge: {
    picking: boolean;
    setPicking: (value: boolean) => void;
    playerA: OrganizerManagedPlayer | null;
    playerB: OrganizerManagedPlayer | null;
    survivingName: string;
    setSurvivingName: (value: string) => void;
    confirming: boolean;
    busy: boolean;
    reset: () => void;
    selectPlayer: (player: OrganizerManagedPlayer) => void;
    beginConfirm: () => void;
    confirmMerge: () => void;
  };
}

export function PlayerManagementPanel(props: PlayerManagementPanelProps) {
  const { colors } = useTheme();
  const canMerge = props.status === "active" && props.players.length >= 2 && !props.guestMessage;
  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView contentContainerStyle={{ padding: spacing.xl, gap: spacing.md, paddingBottom: spacing.xxl }}>
        <Text style={[typography.title, { color: colors.text }]}>Players</Text>
        {props.guestMessage ? (
          <View style={{ gap: spacing.sm }}>
            <Text style={{ color: colors.text, lineHeight: 20 }}>{props.guestMessage}</Text>
            {props.onAttach ? (
              <Pressable onPress={props.onAttach} style={{ minHeight: touch.minSecondary, justifyContent: "center" }}>
                <Text style={{ color: colors.primary, fontWeight: "700" }}>Attach account</Text>
              </Pressable>
            ) : null}
          </View>
        ) : (
          <>
            <PlayerStatusTabs status={props.status} onStatus={props.onStatus} />
            {canMerge ? (
              <Pressable
                onPress={() => props.merge.setPicking(true)}
                style={{ minHeight: touch.minSecondary, justifyContent: "center" }}
              >
                <Text style={{ color: colors.primary, fontWeight: "700" }}>Merge two players</Text>
              </Pressable>
            ) : null}
            <PlayerManagementList
              key={props.status}
              players={props.players}
              status={props.status}
              loading={props.loading}
              onRename={props.onRenaming}
              onAction={props.onPending}
            />
          </>
        )}
      </ScrollView>
      <Pressable onPress={props.onBack} style={{ alignItems: "center", padding: spacing.xl, minHeight: touch.minSecondary }}>
        <Text style={{ color: colors.muted, fontWeight: "600" }}>Back</Text>
      </Pressable>
      {props.status === "active" ? (
        <ArchiveConfirmSheet
          player={props.pending}
          onCancel={() => props.onPending(null)}
          onConfirm={props.onConfirmArchive}
        />
      ) : (
        <UnarchiveConfirmSheet
          player={props.pending}
          onCancel={() => props.onPending(null)}
          onConfirm={props.onConfirmUnarchive}
        />
      )}
      <MergePickSheet
        visible={props.merge.picking}
        players={props.players}
        playerA={props.merge.playerA}
        playerB={props.merge.playerB}
        onSelect={props.merge.selectPlayer}
        onContinue={props.merge.beginConfirm}
        onDismiss={props.merge.reset}
      />
      <MergeConfirmSheet
        visible={props.merge.confirming}
        playerA={props.merge.playerA}
        playerB={props.merge.playerB}
        survivingName={props.merge.survivingName}
        onChangeName={props.merge.setSurvivingName}
        busy={props.merge.busy}
        onConfirm={() => void props.merge.confirmMerge()}
        onDismiss={props.merge.reset}
      />
      <RenamePlayerSheet
        player={props.renaming}
        onCancel={() => props.onRenaming(null)}
        onConfirm={props.onConfirmRename}
      />
    </View>
  );
}
