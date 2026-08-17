import { useMemo, useState } from "react";

import type { KohCreateDraft, KohCreateStep, KohTournamentHub } from "../../types/koh/create";
import {
  addPairToActiveCourt,
  moveSelectedUnit,
  randomizeActiveCourtUnits
} from "../../utilities/koh/assignDraftActions";
import {
  courtsReadyToStart,
  createEmptyDraft,
  hasDuplicatePlayerNames,
  syncCourts
} from "../../utilities/koh/createDraft";
import { submitKohCreate } from "../../utilities/koh/submitKohCreate";

const ALL_STEPS: KohCreateStep[] = [
  "NAME",
  "PAIRING",
  "FORMAT",
  "DEUCE",
  "COURTS",
  "PROMOTION",
  "ASSIGN",
  "REVIEW"
];

function visibleSteps(courts: number): KohCreateStep[] {
  return courts <= 1 ? ALL_STEPS.filter((step) => step !== "PROMOTION") : ALL_STEPS;
}

export interface UseKohCreateWizardParams {
  setErrorText: (value: string) => void;
  markEmailVerifyRequired: (dueAt?: number) => void;
  onStarted: (hub: KohTournamentHub) => void;
  onCancel: () => void;
}

export function useKohCreateWizard(params: UseKohCreateWizardParams) {
  const [draft, setDraft] = useState<KohCreateDraft>(createEmptyDraft);
  const [step, setStep] = useState<KohCreateStep>("NAME");
  const [submitting, setSubmitting] = useState(false);
  const [showRrInfo, setShowRrInfo] = useState(false);
  const [addPairOpen, setAddPairOpen] = useState(false);
  const [pairA, setPairA] = useState("");
  const [pairB, setPairB] = useState("");
  const [pairError, setPairError] = useState("");

  const steps = useMemo(() => visibleSteps(draft.courts), [draft.courts]);
  const stepIndex = Math.max(1, steps.indexOf(step) + 1);
  const activeCourt = draft.courtUnits[draft.assignCourtIndex] ?? draft.courtUnits[0];

  const goNext = () => {
    const index = steps.indexOf(step);
    if (index >= 0 && index < steps.length - 1) setStep(steps[index + 1]);
  };

  const goBack = () => {
    const index = steps.indexOf(step);
    if (index <= 0) {
      params.onCancel();
      return;
    }
    setStep(steps[index - 1]);
  };

  const openAddPair = () => {
    setPairA("");
    setPairB("");
    setPairError("");
    setAddPairOpen(true);
  };

  const savePair = () => {
    const result = addPairToActiveCourt(draft, pairA, pairB);
    if (result.error) {
      setPairError(result.error);
      return;
    }
    setDraft(result.draft);
    setAddPairOpen(false);
  };

  const startTournament = async () => {
    setSubmitting(true);
    try {
      await submitKohCreate(draft, params);
    } finally {
      setSubmitting(false);
    }
  };

  return {
    draft,
    setDraft,
    step,
    steps,
    stepIndex,
    stepCount: steps.length,
    submitting,
    showRrInfo,
    setShowRrInfo,
    addPairOpen,
    setAddPairOpen,
    pairA,
    setPairA,
    pairB,
    setPairB,
    pairError,
    setPairError,
    activeCourt,
    canContinueFromName: draft.name.trim().length >= 2,
    canStart: courtsReadyToStart(draft.courtUnits) && !hasDuplicatePlayerNames(draft.courtUnits),
    goNext,
    goBack,
    setCourts: (value: number) => setDraft((prev) => syncCourts(prev, value)),
    openAddPair,
    savePair,
    randomizeActiveCourt: () => setDraft((prev) => randomizeActiveCourtUnits(prev)),
    moveSelected: (direction: -1 | 1) => setDraft((prev) => moveSelectedUnit(prev, direction)),
    startTournament
  };
}
