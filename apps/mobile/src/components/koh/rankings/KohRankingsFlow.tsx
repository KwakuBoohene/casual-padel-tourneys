import { PageShell } from "../../../layout";
import { useKohRankings } from "../../../hooks/koh/useKohRankings";

import { KohHowRankingSheet } from "./KohHowRankingSheet";
import { KohRankingsPanel } from "./KohRankingsPanel";

interface KohRankingsFlowProps {
  tournamentId: string;
  courtNumber: number;
  setErrorText: (value: string) => void;
  markEmailVerifyRequired: (dueAt?: number) => void;
  onBack: () => void;
}

export function KohRankingsFlow(props: KohRankingsFlowProps) {
  const rankings = useKohRankings({
    tournamentId: props.tournamentId,
    courtNumber: props.courtNumber,
    setErrorText: props.setErrorText,
    markEmailVerifyRequired: props.markEmailVerifyRequired
  });

  return (
    <PageShell>
      <KohRankingsPanel
        courtNumber={props.courtNumber}
        scope={rankings.scope}
        onScope={rankings.setScope}
        rows={rankings.board?.rows ?? []}
        loading={rankings.loading}
        onHowRanking={() => rankings.setHelpOpen(true)}
        onBack={props.onBack}
      />
      <KohHowRankingSheet
        visible={rankings.helpOpen}
        onDismiss={() => rankings.setHelpOpen(false)}
      />
    </PageShell>
  );
}
