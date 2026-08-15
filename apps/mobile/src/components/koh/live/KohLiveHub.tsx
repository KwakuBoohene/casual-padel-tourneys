import { ScrollView, Text, View } from "react-native";

import { AlertSheet, ScoreEntrySheet } from "../../sheets";
import { PageShell } from "../../../layout";
import { useKohLive } from "../../../hooks/koh/useKohLive";
import type { KohTournamentHub } from "../../../types/koh/create";
import { collectHubUnits } from "../../../utilities/koh/courtChangeCopy";
import { spacing, typography } from "../../../theme";
import { useTheme } from "../../../theme/ThemeProvider";

import { KohLiveActions } from "./KohLiveActions";
import { KohCourtChangeSheet } from "./KohCourtChangeSheet";
import { KohLiveCourtPager, KohLiveUnitCard } from "./KohLiveCourtBits";
import { KohPromotePickSheet } from "./KohPromotePickSheet";
import { KohSwapSheet } from "./KohSwapSheet";
import { KohWinMethodSheet } from "./KohWinMethodSheet";

interface KohLiveHubProps {
  hub: KohTournamentHub;
  setHub: (hub: KohTournamentHub) => void;
  errorText: string;
  setErrorText: (value: string) => void;
  markEmailVerifyRequired: (dueAt?: number) => void;
  onBackToList: () => void;
}

export function KohLiveHub(props: KohLiveHubProps) {
  const { colors } = useTheme();
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
            onRename={() => live.showInfo("Rename", "Rename ships with rankings in the next tickets.")}
            onShare={() => live.showInfo("Share", "Share links ship in a later ticket.")}
            onRank={() => live.showInfo("Rankings", "Rankings board ships in ticket 09.")}
            onBack={props.onBackToList}
          />
        </View>
      </View>

      <ScoreEntrySheet
        visible={live.scoreOpen}
        title={`Court ${court?.courtNumber ?? 1}`}
        contextLine="KOH · Winner-stays · games"
        teamALabel={kingLabel}
        teamBLabel={chalLabel}
        scoreA={live.scoreDraft.gamesA}
        scoreB={live.scoreDraft.gamesB}
        canUndo={live.scoreDraft.undoStack.length > 0}
        saveDisabled={live.saving}
        saveLabel={live.canComplete ? "Complete match" : "Save draft"}
        secondarySaveLabel={live.canComplete ? "Save draft" : undefined}
        onChangeScoreA={(next) => live.changeGames("A", next)}
        onChangeScoreB={(next) => live.changeGames("B", next)}
        onUndo={live.undoGames}
        onSave={() => (live.canComplete ? live.requestComplete() : live.saveDraft())}
        onSecondarySave={live.saveDraft}
        onDismiss={live.closeScore}
      />
      <KohWinMethodSheet
        visible={live.methodsOpen}
        draft={live.scoreDraft}
        kingLabel={kingLabel}
        challengerLabel={chalLabel}
        saving={live.saving}
        onChangeMethod={live.setMethod}
        onConfirm={live.confirmMethods}
        onDismiss={live.closeScore}
      />
      <KohSwapSheet
        visible={live.swapOpen}
        king={court?.king ?? null}
        challenger={court?.challenger ?? null}
        waiting={court?.waiting ?? []}
        saving={live.saving}
        onSubmit={(input) => void live.applySwap(input)}
        onDismiss={() => live.setSwapOpen(false)}
      />
      <KohCourtChangeSheet
        visible={Boolean(live.pendingCourtChange)}
        change={live.pendingCourtChange}
        courts={props.hub.courts}
        onDismiss={live.dismissCourtChange}
      />
      {live.pendingPromote ? (
        <KohPromotePickSheet
          visible
          pending={live.pendingPromote}
          unitsById={unitsById}
          saving={live.saving}
          onPick={(id) => void live.applyPromotePick(id)}
        />
      ) : null}
      <AlertSheet
        visible={Boolean(live.infoTitle)}
        variant="info"
        title={live.infoTitle ?? ""}
        message={live.infoMessage}
        primaryAction={{ label: "Got it", onPress: live.dismissInfo }}
        onDismiss={live.dismissInfo}
      />
    </PageShell>
  );
}
