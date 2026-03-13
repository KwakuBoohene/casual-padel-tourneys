import { Modal, Pressable, Text, View } from "react-native";

import { TournamentListView } from "../../organizer/TournamentListView";
import { colors, radius, spacing } from "../../../theme";
import type { LiveTournamentState } from "../../organizer/types";

interface OrganizerListScreenProps {
  tournaments: LiveTournamentState[];
  refreshing: boolean;
  errorText: string;
  showTournamentOptionsModal: boolean;
  showTournamentActionConfirmModal: boolean;
  pendingTournamentAction: "EDIT" | "DELETE" | null;
  onRefresh: () => void;
  onCreateNew: () => void;
  onOpenEstimator: () => void;
  onOpenTournament: (id: string) => void;
  onOpenOptions: (id: string) => void;
  onOpenProfile: () => void;
  onCloseOptionsModal: () => void;
  onRequestEdit: () => void;
  onRequestDelete: () => void;
  onCancelActionConfirm: () => void;
  onConfirmAction: () => void;
}

export function OrganizerListScreen(props: OrganizerListScreenProps) {
  return (
    <>
      <TournamentListView
        tournaments={props.tournaments}
        refreshing={props.refreshing}
        errorText={props.errorText}
        onRefresh={props.onRefresh}
        onCreateNew={props.onCreateNew}
        onOpenEstimator={props.onOpenEstimator}
        onOpenTournament={props.onOpenTournament}
        onOpenOptions={props.onOpenOptions}
        onOpenProfile={props.onOpenProfile}
      />
      <Modal transparent visible={props.showTournamentOptionsModal} animationType="fade" onRequestClose={props.onCloseOptionsModal}>
        <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.4)", alignItems: "center", justifyContent: "center", padding: 24 }}>
          <View
            style={{
              backgroundColor: colors.surfaceAlt,
              width: "100%",
              maxWidth: 420,
              padding: spacing.lg,
              gap: spacing.sm,
              borderRadius: radius.lg
            }}
          >
            <Text style={{ fontSize: 18, fontWeight: "700", color: colors.text }}>Tournament Options</Text>
            <Pressable
              onPress={props.onRequestEdit}
              style={{
                paddingVertical: spacing.sm,
                borderRadius: radius.md,
                backgroundColor: colors.surface,
                borderWidth: 1,
                borderColor: colors.border,
                alignItems: "center",
                justifyContent: "center"
              }}
            >
              <Text style={{ color: colors.text, fontWeight: "600" }}>Edit Tournament</Text>
            </Pressable>
            <Pressable
              onPress={props.onRequestDelete}
              style={{
                paddingVertical: spacing.sm,
                borderRadius: radius.md,
                backgroundColor: colors.danger,
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
                Delete Tournament
              </Text>
            </Pressable>
            <Pressable
              onPress={props.onCloseOptionsModal}
              style={{
                paddingVertical: spacing.sm,
                borderRadius: radius.md,
                backgroundColor: colors.surface,
                borderWidth: 1,
                borderColor: colors.border,
                alignItems: "center",
                justifyContent: "center"
              }}
            >
              <Text style={{ color: colors.text, fontWeight: "600" }}>Cancel</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
      <Modal
        transparent
        visible={props.showTournamentActionConfirmModal}
        animationType="fade"
        onRequestClose={props.onCancelActionConfirm}
      >
        <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.4)", alignItems: "center", justifyContent: "center", padding: 24 }}>
          <View
            style={{
              backgroundColor: colors.surfaceAlt,
              width: "100%",
              maxWidth: 420,
              padding: spacing.lg,
              gap: spacing.md,
              borderRadius: radius.lg
            }}
          >
            <Text style={{ fontSize: 18, fontWeight: "700", color: colors.text }}>
              {props.pendingTournamentAction === "DELETE" ? "Delete Tournament?" : "Edit Tournament?"}
            </Text>
            <Text style={{ color: colors.muted }}>
              {props.pendingTournamentAction === "DELETE"
                ? "Are you sure you want to delete this tournament?"
                : "Are you sure you want to edit this tournament?"}
            </Text>
            <View style={{ flexDirection: "row", gap: spacing.sm }}>
              <Pressable
                onPress={props.onCancelActionConfirm}
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
                <Text style={{ color: colors.text, fontWeight: "600" }}>Cancel</Text>
              </Pressable>
              <Pressable
                onPress={props.onConfirmAction}
                style={{
                  flex: 1,
                  paddingVertical: spacing.sm,
                  borderRadius: radius.md,
                  backgroundColor: props.pendingTournamentAction === "DELETE" ? colors.danger : colors.primary,
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
                  Yes
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

