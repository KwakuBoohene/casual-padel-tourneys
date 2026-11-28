import { useEffect, useLayoutEffect, useMemo, useState } from "react";
import { ActivityIndicator, BackHandler, View } from "react-native";
import { Redirect, useLocalSearchParams } from "expo-router";
import type { TournamentMode } from "@padel/shared";

import { CreateDraftContext } from "../../src/components/organizer/create/CreateDraftContext";
import { LeaveWizardSheet } from "../../src/components/organizer/create/LeaveWizardSheet";
import { OrganizerCreateWizard } from "../../src/components/organizer/create/OrganizerCreateWizard";
import { useOrganizerGa4 } from "../../src/components/analytics/OrganizerGa4";
import { useCreateDraft } from "../../src/hooks/organizer/drafts/useCreateDraft";
import { useCreateTournament } from "../../src/hooks/organizer/useCreateTournament";
import { PageShell } from "../../src/layout";
import { useOrganizerSession } from "../../src/providers/OrganizerSessionProvider";
import { useTheme } from "../../src/theme/ThemeProvider";

const first = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);

function parseMode(value: string | string[] | undefined): TournamentMode | null {
  const raw = first(value);
  if (raw === "AMERICANO" || raw === "MEXICANO") return raw;
  return null;
}

export default function CreateTournamentRoute() {
  const { colors } = useTheme();
  const org = useOrganizerSession();
  const sendAnalytics = useOrganizerGa4();
  const params = useLocalSearchParams<{ mode?: string | string[]; draft?: string | string[] }>();
  const [boot, setBoot] = useState<"pending" | "ready" | "reject">("pending");

  const create = useCreateTournament({
    tournaments: org.tournaments,
    suggestedPlayerNames: org.suggestedPlayerNames,
    setErrorText: org.setErrorText,
    markEmailVerifyRequired: org.markEmailVerifyRequired,
    adoptTournament: (data, editMode) => {
      org.adoptTournament(data, editMode);
      sendAnalytics({ event: "creation_succeeded" });
    }
  });
  const draft = useCreateDraft(create, {
    markEmailVerifyRequired: org.markEmailVerifyRequired,
    setErrorText: org.setErrorText
  });

  useLayoutEffect(() => {
    org.setErrorText("");
    const draftId = first(params.draft);
    if (draftId) {
      void draft.loadDraft(draftId).then((ok) => setBoot(ok ? "ready" : "reject"));
      return;
    }
    const intent = org.consumeCreateIntent();
    const mode = parseMode(params.mode);
    let started = true;
    if (intent?.kind === "mode") create.startCreateWithMode(intent.mode);
    else if (intent?.kind === "estimator") create.startCreateFromEstimator(intent.draft);
    else if (mode) create.startCreateWithMode(mode);
    else started = false;
    // The intent is a one-shot value consumed here, so this cannot move into render or a state
    // initializer (Strict Mode would consume it twice). A layout effect commits before paint.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setBoot(started ? "ready" : "reject");
    // Boot once from draft / intent / ?mode= on mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Android hardware back: offer "Save as draft?" instead of silently dropping the wizard.
  useEffect(() => {
    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      if (!draft.canSave) return false;
      draft.requestLeave();
      return true;
    });
    return () => sub.remove();
  }, [draft]);

  const context = useMemo(
    () => ({
      status: draft.status,
      lastSavedAt: draft.lastSavedAt,
      canSave: draft.canSave,
      saveDraft: draft.saveDraft,
      requestLeave: draft.requestLeave
    }),
    [draft.status, draft.lastSavedAt, draft.canSave, draft.saveDraft, draft.requestLeave]
  );

  if (boot === "reject") {
    return <Redirect href="/tournaments" />;
  }

  if (boot === "pending") {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.background }}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  return (
    <PageShell>
      <CreateDraftContext.Provider value={context}>
        <OrganizerCreateWizard create={create} />
      </CreateDraftContext.Provider>
      <LeaveWizardSheet {...draft.leaveSheet} />
    </PageShell>
  );
}
