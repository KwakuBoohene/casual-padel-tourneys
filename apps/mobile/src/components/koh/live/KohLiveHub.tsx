import { useState } from "react";

import { PageShell } from "../../../layout";
import { useKohLive } from "../../../hooks/koh/useKohLive";
import type { KohTournamentHub } from "../../../types/koh/create";
import { collectHubUnits } from "../../../utilities/koh/courtChangeCopy";
import { KohEditPlayersFlow } from "../edit/KohEditPlayersFlow";
import { KohRankingsFlow } from "../rankings/KohRankingsFlow";

import { KohLiveCourtBody } from "./KohLiveCourtBody";
import { KohLiveOverlaySheets } from "./KohLiveOverlaySheets";

interface KohLiveHubProps {
  hub: KohTournamentHub;
  setHub: (hub: KohTournamentHub) => void;
  errorText: string;
  setErrorText: (value: string) => void;
  markEmailVerifyRequired: (dueAt?: number) => void;
  viewerBaseUrl: string;
  onBackToList: () => void;
}

export function KohLiveHub(props: KohLiveHubProps) {
  const [panel, setPanel] = useState<"live" | "rankings" | "edit">("live");
  const [shareOpen, setShareOpen] = useState(false);
  const [endConfirm, setEndConfirm] = useState(false);
  const live = useKohLive({
    hub: props.hub,
    setHub: props.setHub,
    setErrorText: props.setErrorText,
    markEmailVerifyRequired: props.markEmailVerifyRequired
  });
  const court = live.court;
  const ended = Boolean(props.hub.endedAt);
  const kingLabel = court?.king
    ? `${court.king.playerAName} / ${court.king.playerBName}`
    : "King";
  const chalLabel = court?.challenger
    ? `${court.challenger.playerAName} / ${court.challenger.playerBName}`
    : "Challenger";
  const unitsById = new Map(collectHubUnits(props.hub.courts).map((u) => [u.id, u]));
  const spectatorUrl = `${props.viewerBaseUrl}/tournament/${props.hub.publicToken}`;
  const backToLive = () => {
    props.setErrorText("");
    setPanel("live");
  };

  if (panel === "rankings") {
    return (
      <KohRankingsFlow
        tournamentId={props.hub.id}
        courtNumber={court?.courtNumber ?? 1}
        errorText={props.errorText}
        setErrorText={props.setErrorText}
        markEmailVerifyRequired={props.markEmailVerifyRequired}
        onBack={backToLive}
      />
    );
  }

  if (panel === "edit") {
    return (
      <KohEditPlayersFlow
        hub={props.hub}
        setHub={props.setHub}
        errorText={props.errorText}
        setErrorText={props.setErrorText}
        markEmailVerifyRequired={props.markEmailVerifyRequired}
        onBack={backToLive}
      />
    );
  }

  return (
    <PageShell>
      <KohLiveCourtBody
        name={props.hub.config.name}
        ended={ended}
        errorText={props.errorText}
        court={court}
        courtCount={props.hub.courts.length}
        courtIndex={live.courtIndex}
        canEnterResult={live.canScore && !ended}
        onSelectCourt={live.setCourtIndex}
        onHome={props.onBackToList}
        onEnterResult={live.openScore}
        onSwap={() => live.setSwapOpen(true)}
        onRename={() => setPanel("edit")}
        onShare={() => setShareOpen(true)}
        onRank={() => setPanel("rankings")}
        onEnd={() => setEndConfirm(true)}
      />
      <KohLiveOverlaySheets
        court={court}
        courts={props.hub.courts}
        kingLabel={kingLabel}
        chalLabel={chalLabel}
        scoreOpen={live.scoreOpen}
        methodsOpen={live.methodsOpen}
        swapOpen={live.swapOpen}
        shareOpen={shareOpen}
        endConfirmOpen={endConfirm}
        spectatorUrl={spectatorUrl}
        saving={live.saving}
        canComplete={live.canComplete}
        scoreDraft={live.scoreDraft}
        pendingCourtChange={live.pendingCourtChange}
        pendingPromote={ended ? null : live.pendingPromote}
        unitsById={unitsById}
        changeGames={live.changeGames}
        undoGames={live.undoGames}
        requestComplete={live.requestComplete}
        saveDraft={live.saveDraft}
        closeScore={live.closeScore}
        setMethod={live.setMethod}
        confirmMethods={live.confirmMethods}
        applySwap={live.applySwap}
        setSwapOpen={live.setSwapOpen}
        setShareOpen={setShareOpen}
        setEndConfirmOpen={setEndConfirm}
        onConfirmEnd={() => {
          setEndConfirm(false);
          void live.endNight();
        }}
        dismissCourtChange={live.dismissCourtChange}
        applyPromotePick={live.applyPromotePick}
      />
    </PageShell>
  );
}
