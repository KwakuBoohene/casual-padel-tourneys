import type { KohCourtChange, KohPendingPromote, KohUnit } from "@padel/shared";

import { AlertSheet, ScoreEntrySheet } from "../../sheets";
import type { KohTournamentHub } from "../../../types/koh/create";
import type { KohScoreDraft } from "../../../utilities/koh/scorePayload";

import { KohCourtChangeSheet } from "./KohCourtChangeSheet";
import { KohPromotePickSheet } from "./KohPromotePickSheet";
import { KohSwapSheet } from "./KohSwapSheet";
import { KohWinMethodSheet } from "./KohWinMethodSheet";

type LiveCourt = {
  courtNumber: number;
  king: KohUnit | null;
  challenger: KohUnit | null;
  waiting: KohUnit[];
};

interface KohLiveOverlaySheetsProps {
  court: LiveCourt | undefined;
  courts: KohTournamentHub["courts"];
  kingLabel: string;
  chalLabel: string;
  scoreOpen: boolean;
  methodsOpen: boolean;
  swapOpen: boolean;
  saving: boolean;
  canComplete: boolean;
  scoreDraft: KohScoreDraft;
  pendingCourtChange: KohCourtChange | null;
  pendingPromote: KohPendingPromote | null;
  unitsById: Map<string, KohUnit>;
  infoTitle: string | null;
  infoMessage: string;
  changeGames: (side: "A" | "B", next: number) => void;
  undoGames: () => void;
  requestComplete: () => void;
  saveDraft: () => void;
  closeScore: () => void;
  setMethod: (side: "A" | "B", index: number, method: "REGULAR" | "GOLDEN" | "STAR") => void;
  confirmMethods: () => void;
  applySwap: (input: {
    slot: "KING" | "CHALLENGER";
    withUnitId: string;
    reason: string;
    permanent?: boolean;
  }) => void;
  setSwapOpen: (open: boolean) => void;
  dismissCourtChange: () => void;
  applyPromotePick: (id: string) => void;
  dismissInfo: () => void;
}

export function KohLiveOverlaySheets(props: KohLiveOverlaySheetsProps) {
  return (
    <>
      <ScoreEntrySheet
        visible={props.scoreOpen}
        title={`Court ${props.court?.courtNumber ?? 1}`}
        contextLine="KOH · Winner-stays · games"
        teamALabel={props.kingLabel}
        teamBLabel={props.chalLabel}
        scoreA={props.scoreDraft.gamesA}
        scoreB={props.scoreDraft.gamesB}
        canUndo={props.scoreDraft.undoStack.length > 0}
        saveDisabled={props.saving}
        saveLabel={props.canComplete ? "Complete match" : "Save draft"}
        secondarySaveLabel={props.canComplete ? "Save draft" : undefined}
        onChangeScoreA={(next) => props.changeGames("A", next)}
        onChangeScoreB={(next) => props.changeGames("B", next)}
        onUndo={props.undoGames}
        onSave={() => (props.canComplete ? props.requestComplete() : props.saveDraft())}
        onSecondarySave={props.saveDraft}
        onDismiss={props.closeScore}
      />
      <KohWinMethodSheet
        visible={props.methodsOpen}
        draft={props.scoreDraft}
        kingLabel={props.kingLabel}
        challengerLabel={props.chalLabel}
        saving={props.saving}
        onChangeMethod={props.setMethod}
        onConfirm={props.confirmMethods}
        onDismiss={props.closeScore}
      />
      <KohSwapSheet
        visible={props.swapOpen}
        king={props.court?.king ?? null}
        challenger={props.court?.challenger ?? null}
        waiting={props.court?.waiting ?? []}
        saving={props.saving}
        onSubmit={(input) => void props.applySwap(input)}
        onDismiss={() => props.setSwapOpen(false)}
      />
      <KohCourtChangeSheet
        visible={Boolean(props.pendingCourtChange)}
        change={props.pendingCourtChange}
        courts={props.courts}
        onDismiss={props.dismissCourtChange}
      />
      {props.pendingPromote ? (
        <KohPromotePickSheet
          visible
          pending={props.pendingPromote}
          unitsById={props.unitsById}
          saving={props.saving}
          onPick={(id) => void props.applyPromotePick(id)}
        />
      ) : null}
      <AlertSheet
        visible={Boolean(props.infoTitle)}
        variant="info"
        title={props.infoTitle ?? ""}
        message={props.infoMessage}
        primaryAction={{ label: "Got it", onPress: props.dismissInfo }}
        onDismiss={props.dismissInfo}
      />
    </>
  );
}
