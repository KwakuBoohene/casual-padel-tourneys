import { useState } from "react";
import { ScrollView, Text, View } from "react-native";

import { PageShell } from "../../../layout";
import { useKohLive } from "../../../hooks/koh/useKohLive";
import type { KohTournamentHub } from "../../../types/koh/create";
import { collectHubUnits } from "../../../utilities/koh/courtChangeCopy";
import { spacing, typography } from "../../../theme";
import { useTheme } from "../../../theme/ThemeProvider";
import { KohEditPlayersFlow } from "../edit/KohEditPlayersFlow";
import { KohRankingsFlow } from "../rankings/KohRankingsFlow";

import { KohLiveActions } from "./KohLiveActions";
import { KohLiveCourtPager, KohLiveUnitCard } from "./KohLiveCourtBits";
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
  const { colors } = useTheme();
  const [panel, setPanel] = useState<"live" | "rankings" | "edit">("live");
  const [shareOpen, setShareOpen] = useState(false);
  const live = useKohLive({
    hub: props.hub,
    setHub: props.setHub,
    setErrorText: props.setErrorText,
    markEmailVerifyRequired: props.markEmailVerifyRequired
  });
  const court = live.court;
  const kingLabel = court?.king
    ? `${court.king.playerAName} / ${court.king.playerBName}`
    : "King";
  const chalLabel = court?.challenger
    ? `${court.challenger.playerAName} / ${court.challenger.playerBName}`
    : "Challenger";
  const unitsById = new Map(collectHubUnits(props.hub.courts).map((unit) => [unit.id, unit]));
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
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        <ScrollView
          contentContainerStyle={{ padding: spacing.xl, gap: spacing.md, paddingBottom: spacing.sm }}
        >
          <Text style={[typography.title, { color: colors.text }]}>{props.hub.config.name}</Text>
          <Text style={{ color: colors.primary, fontWeight: "600" }}>KOH · Winner-stays</Text>
          <KohLiveCourtPager
            courtCount={props.hub.courts.length}
            courtIndex={live.courtIndex}
            onSelect={live.setCourtIndex}
          />
          {court?.king ? <KohLiveUnitCard label="KING" unit={court.king} emphasized /> : null}
          {court?.king && court?.challenger ? (
            <Text style={{ color: colors.muted, textAlign: "center", fontWeight: "600" }}>vs</Text>
          ) : null}
          {court?.challenger ? <KohLiveUnitCard label="CHALLENGER" unit={court.challenger} /> : null}
          {(court?.waiting ?? []).map((unit) => (
            <KohLiveUnitCard key={unit.id} label="WAIT" unit={unit} />
          ))}
          {props.errorText ? <Text style={{ color: colors.danger }}>{props.errorText}</Text> : null}
        </ScrollView>
        <View style={{ paddingHorizontal: spacing.xl }}>
          <KohLiveActions
            canEnterResult={live.canScore}
            onEnterResult={live.openScore}
            onSwap={() => live.setSwapOpen(true)}
            onRename={() => setPanel("edit")}
            onShare={() => setShareOpen(true)}
            onRank={() => setPanel("rankings")}
            onBack={props.onBackToList}
          />
        </View>
      </View>
      <KohLiveOverlaySheets
        court={court}
        courts={props.hub.courts}
        kingLabel={kingLabel}
        chalLabel={chalLabel}
        scoreOpen={live.scoreOpen}
        methodsOpen={live.methodsOpen}
        swapOpen={live.swapOpen}
        shareOpen={shareOpen}
        spectatorUrl={spectatorUrl}
        saving={live.saving}
        canComplete={live.canComplete}
        scoreDraft={live.scoreDraft}
        pendingCourtChange={live.pendingCourtChange}
        pendingPromote={live.pendingPromote}
        unitsById={unitsById}
        infoTitle={live.infoTitle}
        infoMessage={live.infoMessage}
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
        dismissCourtChange={live.dismissCourtChange}
        applyPromotePick={live.applyPromotePick}
        dismissInfo={live.dismissInfo}
      />
    </PageShell>
  );
}
