import { Text, View } from "react-native";

import type { KohCreateDraft } from "../../types/koh/create";
import { balanceHintForCounts } from "../../utilities/koh/createDraft";
import { deuceLabel, formatLabel } from "../../utilities/koh/regularScoringFromDraft";
import { WizardChrome } from "../organizer/create/WizardChrome";
import { radius, spacing } from "../../theme";
import { useTheme } from "../../theme/ThemeProvider";

interface KohReviewStepProps {
  stepIndex: number;
  stepCount: number;
  draft: KohCreateDraft;
  canStart: boolean;
  submitting: boolean;
  errorText: string;
  onBack: () => void;
  onStart: () => void;
}

export function KohReviewStep(props: KohReviewStepProps) {
  const { colors } = useTheme();
  const counts = props.draft.courtUnits.map((court) => court.units.length);
  const balance = balanceHintForCounts(counts);

  return (
    <WizardChrome
      modeLabel="King of the Court"
      stepIndex={props.stepIndex}
      stepCount={props.stepCount}
      title="Review & start"
      subtitle={`${props.draft.name.trim()} · ${formatLabel(props.draft.matchFormat)} · ${deuceLabel(props.draft.deuceMode)}`}
      primaryLabel={props.submitting ? "Starting…" : "Start tournament"}
      primaryDisabled={!props.canStart || props.submitting}
      onPrimary={props.onStart}
      onBack={props.onBack}
    >
      {props.draft.courtUnits.map((court) => {
        const king = court.units[0];
        const next = court.units[1];
        const waiting = court.units.slice(2);
        return (
          <View
            key={court.courtNumber}
            style={{
              borderRadius: radius.lg,
              borderWidth: 1,
              borderColor: colors.border,
              backgroundColor: colors.surface,
              padding: spacing.md,
              gap: 4
            }}
          >
            <Text style={{ color: colors.text, fontWeight: "700", fontSize: 15 }}>
              Court {court.courtNumber}
              {court.courtNumber === 1 ? " — Top" : ""} · {court.units.length} pairs
            </Text>
            <Text style={{ color: colors.muted, fontSize: 13 }}>
              King: {king ? `${king.playerAName} / ${king.playerBName}` : "—"}
            </Text>
            <Text style={{ color: colors.muted, fontSize: 13 }}>
              Next: {next ? `${next.playerAName} / ${next.playerBName}` : "—"}
            </Text>
            {waiting.length > 0 ? (
              <Text style={{ color: colors.muted, fontSize: 13 }}>
                Waiting:{" "}
                {waiting.map((unit) => `${unit.playerAName}/${unit.playerBName}`).join(", ")}
              </Text>
            ) : null}
          </View>
        );
      })}
      {balance ? <Text style={{ color: colors.muted, fontSize: 13 }}>{balance}</Text> : null}
      <Text style={{ color: colors.muted, fontSize: 12 }}>
        Doubles only. Each court needs at least 2 pairs. Max 12 per court.
      </Text>
      {props.errorText ? <Text style={{ color: colors.danger }}>{props.errorText}</Text> : null}
    </WizardChrome>
  );
}
