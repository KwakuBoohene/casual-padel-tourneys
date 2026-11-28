import { useEffect, useRef } from "react";
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, Text, View } from "react-native";
import { isKohDraftPayload } from "@padel/shared";

import type { DraftDetail, StartDraftResponse } from "../../api/drafts";
import { DraftConflictSheet } from "../../components/organizer/drafts/DraftConflictSheet";
import { AlertSheet } from "../../components/sheets";
import { useDraftOverview } from "../../hooks/organizer/drafts/useDraftOverview";
import { useStartDraft } from "../../hooks/organizer/drafts/useStartDraft";
import type { CreateWizardStep } from "../../hooks/organizer/useCreateTournament";
import { useBreakpoint } from "../../layout";
import { spacing, typography } from "../../theme";
import { useTheme } from "../../theme/ThemeProvider";
import { relativeTime } from "../../utilities/organizer/draftListLabels";
import { draftOverviewSections } from "../../utilities/organizer/draftOverviewSections";
import { draftStartSummary, keepAccessLine } from "../../utilities/organizer/draftStart";

import { DraftActions } from "./components/DraftActions";
import { DraftCollaboratorsRow } from "./components/DraftCollaboratorsRow";
import { DraftReadinessCard } from "./components/DraftReadinessCard";
import { DraftSectionRow } from "./components/DraftSectionRow";
import { StartDraftSheet } from "./components/StartDraftSheet";

export interface DraftOverviewScreenProps {
  draftId: string;
  /** Opened from the wizard's Create button: show the start confirmation once the draft loads. */
  openStart: boolean;
  markEmailVerifyRequired: (dueAt?: number) => void;
  onBack: () => void;
  onEditStep: (step: CreateWizardStep) => void;
  onStarted: (response: StartDraftResponse, draft: DraftDetail) => void;
  onOpenTournament: (tournamentId: string) => void;
}

/** Draft overview (Figma 04 · `3:106`): what's missing, edit by section, start. */
export function DraftOverviewScreen(props: DraftOverviewScreenProps) {
  const { colors } = useTheme();
  const { formMaxWidth } = useBreakpoint();
  const overview = useDraftOverview(props.draftId, { markEmailVerifyRequired: props.markEmailVerifyRequired });
  const { draft } = overview;
  const start = useStartDraft(draft, {
    onStarted: props.onStarted,
    onGone: () => void overview.refresh(),
    onLatest: overview.adoptLatest,
    markEmailVerifyRequired: props.markEmailVerifyRequired
  });

  const autoOpened = useRef(false);
  const openStart = start.open;
  useEffect(() => {
    if (!props.openStart || autoOpened.current || !draft?.readiness.ready || draft.startedTournamentId) return;
    autoOpened.current = true;
    openStart();
  }, [props.openStart, draft, openStart]);

  if (overview.failure || (!draft && !overview.loading)) {
    return (
      <AlertSheet
        visible
        variant="warning"
        title="Draft unavailable"
        message={overview.failure?.message ?? "Couldn't load this draft."}
        primaryAction={{ label: "Back to tournaments", onPress: props.onBack }}
        onDismiss={props.onBack}
      />
    );
  }
  if (!draft) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.background }}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  const editable = !isKohDraftPayload(draft.payload);
  const name = draft.name.trim() || "Untitled draft";
  const startedBy = draft.startedTournamentId;
  const canOpenStarted = draft.role !== "EDITOR" || draft.keepAccessAfterStart;

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          paddingHorizontal: spacing.xl,
          paddingTop: spacing.xxl,
          paddingBottom: spacing.md,
          gap: spacing.md,
          maxWidth: formMaxWidth,
          width: "100%",
          alignSelf: "center"
        }}
        refreshControl={<RefreshControl refreshing={overview.refreshing} onRefresh={() => void overview.refresh()} />}
      >
        <Pressable onPress={props.onBack} accessibilityRole="button" hitSlop={10} style={{ alignSelf: "flex-start" }}>
          <Text style={{ color: colors.primary, fontWeight: "600", fontSize: 15 }}>‹ Tournaments</Text>
        </Pressable>
        <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.sm }}>
          <Text style={[typography.title, { flex: 1, color: colors.text }]} numberOfLines={2}>
            {name}
          </Text>
          <Text style={{ fontSize: 12, fontWeight: "700", color: draft.role === "EDITOR" ? colors.connected : colors.statusNext }}>
            {draft.role === "EDITOR" ? "Shared" : "Draft"}
          </Text>
        </View>
        <Text style={{ fontSize: 13, color: colors.muted }}>
          Autosaved {relativeTime(draft.updatedAt)} by {draft.updatedBy.name}
        </Text>
        <DraftReadinessCard readiness={draft.readiness} />
        {draftOverviewSections(draft.readiness).map((section) => (
          <DraftSectionRow
            key={section.key}
            section={section}
            onPress={editable ? () => props.onEditStep(section.step) : undefined}
          />
        ))}
        {!editable ? (
          <Text style={{ fontSize: 13, color: colors.muted }}>
            Editing King of the Court drafts in the app is coming soon. You can still start it here.
          </Text>
        ) : null}
        <DraftCollaboratorsRow editors={overview.editors} />
      </ScrollView>

      <DraftActions
        formMaxWidth={formMaxWidth}
        ready={draft.readiness.ready}
        blockingReason={draft.readiness.blockingReason}
        onStart={start.open}
      />

      <StartDraftSheet
        {...start.sheet}
        name={name}
        summary={draftStartSummary(draft.payload)}
        accessLine={keepAccessLine(overview.editors.map((editor) => editor.name), draft.keepAccessAfterStart)}
      />
      <DraftConflictSheet {...start.conflict} />
      <AlertSheet
        visible={Boolean(startedBy)}
        variant="info"
        title={`${draft.updatedBy.name} started this tournament`}
        message={canOpenStarted ? "It's live now." : "Co-organizer access ended when it started."}
        primaryAction={
          canOpenStarted && startedBy
            ? { label: "Open tournament", onPress: () => props.onOpenTournament(startedBy) }
            : { label: "Back to tournaments", onPress: props.onBack }
        }
        onDismiss={props.onBack}
      />
    </View>
  );
}
