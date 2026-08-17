import { useState } from "react";
import { Pressable, Text, View } from "react-native";

import { AlertSheet, ErrorAlertSheet } from "../../sheets";
import { radius, spacing, touch } from "../../../theme";
import { useTheme } from "../../../theme/ThemeProvider";

import type { TeamPairDraft } from "../../../hooks/organizer/usePlayerRoster";

import { MexicanoAddPairSheet } from "./MexicanoAddPairSheet";
import { WizardChrome } from "./WizardChrome";

interface TeamPlayersStepViewProps {
  modeLabel: string;
  teams: TeamPairDraft[];
  minTeams: number;
  canContinue: boolean;
  hasDuplicateNames: boolean;
  hint: string;
  onAddTeam: (playerA: string, playerB: string) => void;
  onUpdateTeam: (index: number, playerA: string, playerB: string) => void;
  onRemoveTeam: (index: number) => void;
  onBack: () => void;
  onNext: () => void;
}

export function TeamPlayersStepView(props: TeamPlayersStepViewProps) {
  const { colors } = useTheme();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editIndex, setEditIndex] = useState<number | null>(null);
  const [playerA, setPlayerA] = useState("");
  const [playerB, setPlayerB] = useState("");
  const [sheetError, setSheetError] = useState("");
  const [removeIndex, setRemoveIndex] = useState<number | null>(null);

  const openAdd = () => {
    setEditIndex(null);
    setPlayerA("");
    setPlayerB("");
    setSheetError("");
    setSheetOpen(true);
  };

  const openEdit = (index: number) => {
    const team = props.teams[index];
    setEditIndex(index);
    setPlayerA(team.playerA);
    setPlayerB(team.playerB);
    setSheetError("");
    setSheetOpen(true);
  };

  const savePair = () => {
    const a = playerA.trim();
    const b = playerB.trim();
    if (!a || !b) {
      setSheetError("Both player names are required.");
      return;
    }
    if (a.toLowerCase() === b.toLowerCase()) {
      setSheetError("Partners need different names.");
      return;
    }
    if (editIndex !== null) {
      props.onUpdateTeam(editIndex, a, b);
    } else {
      props.onAddTeam(a, b);
    }
    setSheetOpen(false);
  };

  return (
    <>
      <WizardChrome
        modeLabel={props.modeLabel}
        stepIndex={3}
        stepCount={4}
        title="Teams"
        subtitle={`${props.teams.length} pairs · min ${props.minTeams}`}
        primaryLabel="Continue"
        primaryDisabled={!props.canContinue}
        onPrimary={props.onNext}
        onBack={props.onBack}
        footerExtra={
          <Pressable
            onPress={openAdd}
            style={{
              minHeight: touch.minPrimary,
              borderRadius: 14,
              borderWidth: 1,
              borderColor: colors.border,
              backgroundColor: colors.surface,
              alignItems: "center",
              justifyContent: "center"
            }}
          >
            <Text style={{ color: colors.text, fontWeight: "700", fontSize: 17 }}>+ Add pair</Text>
          </Pressable>
        }
      >
        <View style={{ gap: spacing.sm }}>
          <Text style={{ color: colors.muted, fontSize: 13 }}>{props.hint}</Text>
          {props.teams.length === 0 ? (
            <Text style={{ color: colors.muted }}>No pairs yet. Add at least {props.minTeams}.</Text>
          ) : (
            props.teams.map((team, index) => (
              <View
                key={`${index}-${team.playerA}-${team.playerB}`}
                style={{
                  minHeight: touch.minSecondary,
                  borderRadius: radius.lg,
                  borderWidth: 1,
                  borderColor: colors.border,
                  backgroundColor: colors.surface,
                  paddingHorizontal: spacing.md,
                  paddingVertical: spacing.sm,
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: spacing.sm
                }}
              >
                <Pressable onPress={() => openEdit(index)} style={{ flex: 1 }}>
                  <Text style={{ color: colors.muted, fontSize: 11, fontWeight: "600" }}>
                    PAIR {index + 1}
                  </Text>
                  <Text style={{ color: colors.text, fontSize: 16, fontWeight: "600" }}>
                    {team.playerA} / {team.playerB}
                  </Text>
                </Pressable>
                <Pressable onPress={() => setRemoveIndex(index)} hitSlop={8}>
                  <Text style={{ color: colors.danger, fontWeight: "600" }}>Remove</Text>
                </Pressable>
              </View>
            ))
          )}
          {props.hasDuplicateNames ? (
            <Text style={{ color: colors.danger, fontSize: 12 }}>
              No two players can have the same name.
            </Text>
          ) : null}
        </View>
      </WizardChrome>

      <MexicanoAddPairSheet
        visible={sheetOpen}
        title={editIndex !== null ? "Edit pair" : "Add pair"}
        playerA={playerA}
        playerB={playerB}
        onChangePlayerA={setPlayerA}
        onChangePlayerB={setPlayerB}
        onSave={savePair}
        onDismiss={() => setSheetOpen(false)}
      />
      <ErrorAlertSheet
        visible={Boolean(sheetError)}
        message={sheetError}
        onDismiss={() => setSheetError("")}
      />

      <AlertSheet
        visible={removeIndex !== null}
        variant="warning"
        title="Remove this pair?"
        message="Both players leave the roster."
        primaryAction={{
          label: "Remove",
          destructive: true,
          onPress: () => {
            if (removeIndex !== null) props.onRemoveTeam(removeIndex);
            setRemoveIndex(null);
          }
        }}
        secondaryAction={{ label: "Cancel", onPress: () => setRemoveIndex(null) }}
        onDismiss={() => setRemoveIndex(null)}
      />
    </>
  );
}
