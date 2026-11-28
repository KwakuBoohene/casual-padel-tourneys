import { useEffect, useLayoutEffect, useMemo, useState } from "react";
import { ActivityIndicator, BackHandler, View } from "react-native";

import { useGa4Wizard } from "../../hooks/analytics/useGa4Wizard";
import { useKohCreateDraft } from "../../hooks/koh/useKohCreateDraft";
import { AlertSheet, ErrorAlertSheet } from "../sheets";
import { useKohCreateWizard } from "../../hooks/koh/useKohCreateWizard";
import { useTheme } from "../../theme/ThemeProvider";
import type { KohCreateStep, KohTournamentHub } from "../../types/koh/create";
import { CreateDraftContext } from "../organizer/create/CreateDraftContext";
import { LeaveWizardSheet } from "../organizer/create/LeaveWizardSheet";
import { DraftConflictSheet } from "../organizer/drafts/DraftConflictSheet";

import { KohAddPairSheet } from "./KohAddPairSheet";
import { KohCreateSteps } from "./KohCreateSteps";

interface KohCreateFlowProps {
  setErrorText: (value: string) => void;
  markEmailVerifyRequired: (dueAt?: number) => void;
  onCancel: () => void;
  onStarted: (hub: KohTournamentHub) => void;
  /** Resume a saved draft (`/koh?draft=`), optionally at a step. */
  draftId?: string;
  initialStep?: KohCreateStep;
}

export function KohCreateFlow(props: KohCreateFlowProps) {
  const { colors } = useTheme();
  const wizard = useKohCreateWizard({
    setErrorText: props.setErrorText,
    markEmailVerifyRequired: props.markEmailVerifyRequired,
    onCancel: props.onCancel,
    onStarted: props.onStarted
  });
  const draft = useKohCreateDraft(wizard, {
    markEmailVerifyRequired: props.markEmailVerifyRequired,
    setErrorText: props.setErrorText,
    exit: props.onCancel
  });
  const [booted, setBooted] = useState(!props.draftId);

  useLayoutEffect(() => {
    if (!props.draftId) return;
    void draft.loadDraft(props.draftId, props.initialStep).then((ok) => (ok ? setBooted(true) : props.onCancel()));
    // Load the draft once on mount.
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
      requestLeave: draft.requestLeave,
      finish: draft.finish
    }),
    [draft.status, draft.lastSavedAt, draft.canSave, draft.saveDraft, draft.requestLeave, draft.finish]
  );

  const steps = {
    NAME: "name", PAIRING: "pairing", FORMAT: "format", DEUCE: "deuce",
    COURTS: "courts", PROMOTION: "promotion", ASSIGN: "assign", REVIEW: "review"
  } as const;
  useGa4Wizard(steps[wizard.step]);

  if (!booted) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.background }}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  return (
    <CreateDraftContext.Provider value={context}>
      <KohCreateSteps wizard={wizard} />
      <KohAddPairSheet
        visible={wizard.addPairOpen}
        courtNumber={wizard.activeCourt?.courtNumber ?? 1}
        playerA={wizard.pairA}
        playerB={wizard.pairB}
        onChangePlayerA={wizard.setPairA}
        onChangePlayerB={wizard.setPairB}
        onSave={wizard.savePair}
        onDismiss={() => wizard.setAddPairOpen(false)}
      />
      <ErrorAlertSheet
        visible={Boolean(wizard.pairError)}
        message={wizard.pairError}
        onDismiss={() => wizard.setPairError("")}
      />
      <AlertSheet
        visible={wizard.showRrInfo}
        variant="info"
        title="Round-robin pairs"
        message="Round-robin pairing ships in a later epic. Winner-stays is ready now."
        primaryAction={{ label: "Got it", onPress: () => wizard.setShowRrInfo(false) }}
        onDismiss={() => wizard.setShowRrInfo(false)}
      />
      <LeaveWizardSheet {...draft.leaveSheet} />
      <DraftConflictSheet {...draft.conflictSheet} />
    </CreateDraftContext.Provider>
  );
}
