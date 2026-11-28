import { ActivityIndicator, ScrollView, Text, View } from "react-native";

import type { DraftSharingController } from "../../../../hooks/organizer/drafts/useDraftSharing";
import { spacing } from "../../../../theme";
import { useTheme } from "../../../../theme/ThemeProvider";
import { BottomSheet, SheetButton } from "../../../sheets";

import { DraftPersonRow } from "./DraftPersonRow";
import { InviteEmailField } from "./InviteEmailField";
import { KeepAccessToggleRow } from "./KeepAccessToggleRow";

interface DraftShareSheetProps {
  sharing: DraftSharingController;
  draftName: string;
  /** Signed-in user, so nobody is offered "Remove" on themselves. */
  viewerUserId?: string;
}

const day = (iso: string) => new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });

/** "Share draft" (Figma 05 · `3:161`). */
export function DraftShareSheet({ sharing, draftName, viewerUserId }: DraftShareSheetProps) {
  const { colors } = useTheme();
  const people = sharing.people;
  const canManage = Boolean(people?.can.managePeople);

  return (
    <BottomSheet visible={sharing.visible} title={`Share ${draftName}`} onDismiss={sharing.close}>
      <ScrollView style={{ maxHeight: 460 }} contentContainerStyle={{ gap: spacing.md }} keyboardShouldPersistTaps="handled">
        <Text style={{ fontSize: 14, color: colors.muted }}>
          Co-organizers can edit this draft, invite others and start it. Only the owner can delete it.
        </Text>
        {canManage ? (
          <InviteEmailField
            value={sharing.email}
            error={sharing.emailError}
            busy={sharing.busy === "invite"}
            onChange={sharing.setEmail}
            onInvite={sharing.invite}
          />
        ) : null}
        {sharing.notice ? <Text style={{ fontSize: 13, color: colors.statusCompleted }}>{sharing.notice}</Text> : null}
        {sharing.loading ? <ActivityIndicator color={colors.primary} /> : null}
        {sharing.loadError ? <Text style={{ fontSize: 13, color: colors.danger }}>{sharing.loadError}</Text> : null}

        {people ? (
          <View style={{ gap: spacing.xs }}>
            <Text style={{ fontSize: 12, fontWeight: "700", color: colors.muted }}>PEOPLE WITH ACCESS</Text>
            <DraftPersonRow title={people.owner.name} subtitle={people.owner.email} tag="Owner" />
            {people.editors.map((editor) => (
              <DraftPersonRow
                key={editor.userId}
                title={editor.name}
                subtitle={editor.email}
                tag="Editor"
                actions={
                  canManage && editor.userId !== viewerUserId
                    ? [
                        {
                          label: sharing.confirmRemove === editor.userId ? "Confirm remove" : "Remove",
                          danger: true,
                          disabled: sharing.busy === `remove:${editor.userId}`,
                          onPress: () => sharing.remove(editor.userId)
                        }
                      ]
                    : []
                }
              />
            ))}
            {people.invitations.map((invite) => (
              <DraftPersonRow
                key={invite.id}
                title={invite.email}
                subtitle={`expires ${day(invite.expiresAt)}`}
                tag="Pending"
                actions={
                  canManage
                    ? [
                        { label: "Resend", disabled: Boolean(sharing.busy), onPress: () => sharing.resend(invite.id) },
                        { label: "Revoke", danger: true, disabled: Boolean(sharing.busy), onPress: () => sharing.revoke(invite.id) }
                      ]
                    : []
                }
              />
            ))}
          </View>
        ) : null}

        {people ? (
          <KeepAccessToggleRow
            value={people.keepAccessAfterStart}
            editable={people.can.changeSettings}
            busy={sharing.busy === "keepAccess"}
            onChange={sharing.setKeepAccess}
          />
        ) : null}
        <SheetButton label="Done" onPress={sharing.close} />
      </ScrollView>
    </BottomSheet>
  );
}
