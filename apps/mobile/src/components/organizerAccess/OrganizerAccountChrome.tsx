import { useState, type ReactNode } from "react";
import { ActivityIndicator, Modal, Pressable, Text, View } from "react-native";
import { router } from "expo-router";
import { useOrganizerAccount } from "../../providers/OrganizerAccountProvider";
import { useTheme } from "../../theme/ThemeProvider";
import { pendingOrganizerWrites } from "../../api/organizerContext";
import { BottomSheet } from "../sheets";
import { radius, spacing } from "../../theme";
import { useBreakpoint } from "../../layout";

export function OrganizerAccountChrome({ children }: { children: ReactNode }) {
  const account = useOrganizerAccount();
  const { colors } = useTheme();
  const { isWide } = useBreakpoint();
  const [open, setOpen] = useState(false);
  if (!account.ready || !account.selected)
    return <ActivityIndicator style={{ flex: 1 }} color={colors.primary} />;

  const selected = account.selected;
  const selectedLabel = selected.role === "OWNER" ? "My organizer workspace · Owner" : `${selected.name} · Manager access`;
  const switcherContent = (
    <>
      <Text style={{ color: colors.muted }}>Your workspace and workspaces where an owner invited you to manage.</Text>
      <View style={{ gap: spacing.sm }}>
        {account.accounts.map((entry) => {
          const active = entry.id === selected.id;
          return (
            <Pressable key={entry.id} accessibilityRole="button" accessibilityLabel={`${entry.role === "OWNER" ? "My organizer workspace, owner" : `${entry.name}, manager access`}${active ? ", current" : ""}`} onPress={() => { if (active) return; account.select(entry); setOpen(false); }} style={{ minHeight: 68, borderRadius: radius.lg, backgroundColor: active ? colors.surface : "transparent", padding: spacing.md, flexDirection: "row", alignItems: "center", gap: spacing.md }}>
              <Text style={{ color: entry.role === "OWNER" ? colors.primary : colors.statusNext, fontWeight: "800" }}>{entry.name.slice(0, 2).toUpperCase()}</Text>
              <View style={{ flex: 1, gap: 2 }}><Text style={{ color: colors.text, fontWeight: "700" }}>{entry.role === "OWNER" ? "My organizer workspace" : entry.name}</Text><Text style={{ color: colors.muted, fontSize: 12 }}>{entry.role === "OWNER" ? "You are the owner" : "You are a manager"}{active ? " · Current" : ""}</Text></View>
              <Text style={{ color: active ? colors.primary : colors.muted }}>{active ? "✓" : "→"}</Text>
            </Pressable>
          );
        })}
      </View>
      <View style={{ height: 1, backgroundColor: colors.border }} />
      <Pressable accessibilityRole="button" accessibilityLabel="Organizer settings" onPress={() => { setOpen(false); if (!pendingOrganizerWrites()) router.push("/organizer-access"); }} style={{ minHeight: 52, paddingHorizontal: spacing.md, borderRadius: radius.md, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
        <Text style={{ color: colors.text, fontWeight: "700" }}>⚙  Organizer settings</Text><Text style={{ color: colors.muted }}>→</Text>
      </Pressable>
      <Pressable accessibilityRole="button" accessibilityLabel="Personal profile" onPress={() => { setOpen(false); router.push("/profile"); }} style={{ minHeight: 52, paddingHorizontal: spacing.md, borderRadius: radius.md, justifyContent: "center" }}><Text style={{ color: colors.text }}>♙  Personal profile</Text></Pressable>
    </>
  );
  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={{ minHeight: 72, paddingHorizontal: isWide ? 48 : spacing.lg, paddingVertical: spacing.sm, backgroundColor: colors.surface, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: spacing.sm }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 52 }}>
          <Text style={{ color: colors.primary, fontWeight: "800", fontSize: isWide ? 15 : 13 }}>CASUAL PADEL</Text>
          {isWide ? <Text style={{ color: colors.muted, fontSize: 14 }}>Tournaments     Players     Leaderboard</Text> : null}
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Organizer workspace: ${selectedLabel}. Switch workspace`}
          onPress={() => setOpen(true)}
          style={{ height: 44, width: isWide ? 378 : undefined, maxWidth: isWide ? 378 : 260, paddingHorizontal: 14, borderRadius: isWide ? radius.md : radius.pill, backgroundColor: colors.surfaceAlt, flexDirection: "row", alignItems: "center", justifyContent: isWide ? "center" : "flex-start", gap: 10 }}
        >
          <View style={{ width: 30, height: 30, borderRadius: 15, backgroundColor: colors.surface, alignItems: "center", justifyContent: "center" }}>
            <Text style={{ color: colors.primary, fontWeight: "800", fontSize: 10 }}>{selected.name.slice(0, 2).toUpperCase()}</Text>
          </View>
          <Text numberOfLines={1} style={{ color: colors.text, fontWeight: "700", fontSize: 12, flexShrink: 1 }}>{selectedLabel}</Text>
          <View style={{ width: 20, height: 20, alignItems: "center", justifyContent: "center" }}><Text style={{ color: colors.muted, fontSize: 16, lineHeight: 16 }}>▾</Text></View>
        </Pressable>
      </View>
      {selected.role === "MANAGER" ? (
        <View style={{ margin: spacing.lg, marginBottom: 0, borderLeftWidth: 4, borderLeftColor: colors.statusNext, borderRadius: radius.lg, backgroundColor: colors.surface, padding: spacing.lg, gap: 4 }}>
          <Text style={{ color: colors.statusNext, fontWeight: "700" }}>You’re managing {selected.name}</Text>
          <Text style={{ color: colors.muted, fontSize: 12 }}>Changes are recorded under your personal login.</Text>
        </View>
      ) : null}
      {account.notice ? <Text accessibilityRole="alert" style={{ color: colors.danger, padding: spacing.md }}>{account.notice}</Text> : null}
      <View style={{ flex: 1 }}>{children}</View>

      {isWide ? (
        <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
          <Pressable style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.35)" }} onPress={() => setOpen(false)}>
            <Pressable onPress={(event) => event.stopPropagation()} style={{ position: "absolute", top: 64, right: 48, width: 378, padding: spacing.lg, gap: spacing.md, borderRadius: radius.lg, backgroundColor: colors.surfaceAlt, borderWidth: 1, borderColor: colors.border }}>
              <Text style={{ color: colors.text, fontSize: 18, fontWeight: "700" }}>Organizer workspaces</Text>
              {switcherContent}
            </Pressable>
          </Pressable>
        </Modal>
      ) : (
        <BottomSheet visible={open} title="Organizer workspaces" onDismiss={() => setOpen(false)} maxWidth={440}>{switcherContent}</BottomSheet>
      )}
    </View>
  );
}
