import { useState } from "react";
import { Text, View } from "react-native";
import type { PlayerGender, TournamentVariant } from "@padel/shared";

import { AlertSheet } from "../../sheets";
import { spacing } from "../../../theme";
import { useTheme } from "../../../theme/ThemeProvider";

import { PLAYERS_PER_PAGE, usePlayerPages } from "../../../hooks/organizer/usePlayerPages";

import { AddPlayerSheet } from "./AddPlayerSheet";
import { PlayerPageRow } from "./PlayerPageRow";
import { PlayerSuggestions } from "./PlayerSuggestions";
import { PlayersPageActions } from "./PlayersPageActions";
import { WizardChrome } from "./WizardChrome";

interface PlayersStepViewProps {
  modeLabel: string;
  players: string[];
  genders: (PlayerGender | undefined)[];
  variant: TournamentVariant;
  minPlayers: number;
  canContinue: boolean;
  hasDuplicateNames: boolean;
  allSuggestions: string[];
  onAddPlayer: (name: string, gender?: PlayerGender) => void;
  onUpdatePlayer: (index: number, name: string, gender?: PlayerGender) => void;
  onRemovePlayer: (index: number) => void;
  onSelectSuggestion: (name: string) => void;
  onBack: () => void;
  onNext: () => void;
}

export function PlayersStepView(props: PlayersStepViewProps) {
  const { colors } = useTheme();
  const pages = usePlayerPages(props.players.length);
  const [sheetMode, setSheetMode] = useState<"add" | "edit" | null>(null);
  const [editIndex, setEditIndex] = useState<number | null>(null);
  const [removeIndex, setRemoveIndex] = useState<number | null>(null);
  const pagePlayers = props.players.slice(pages.pageStart, pages.pageEnd);
  const subtitle = `${props.players.length} added · Page ${pages.pageIndex + 1} of ${pages.pageCount} · ${PLAYERS_PER_PAGE} per page`;

  return (
    <>
      <WizardChrome
        modeLabel={props.modeLabel}
        stepIndex={3}
        stepCount={4}
        title="Players"
        subtitle={subtitle}
        primaryLabel="Continue"
        primaryDisabled={!props.canContinue}
        onPrimary={props.onNext}
        onBack={props.onBack}
        footerExtra={
          <PlayersPageActions
            canGoPrevPage={pages.canGoPrevPage}
            canGoNextPage={pages.canGoNextPage}
            onPrevPage={pages.goPrevPage}
            onNextPage={pages.goNextPage}
            onAddPlayer={() => {
              setEditIndex(null);
              setSheetMode("add");
            }}
          />
        }
      >
        <View style={{ gap: spacing.sm }}>
          {pagePlayers.length === 0 ? (
            <Text style={{ color: colors.muted }}>
              No players yet. Tap + Add player to start (min {props.minPlayers}).
            </Text>
          ) : (
            pagePlayers.map((name, offset) => {
              const index = pages.pageStart + offset;
              return (
                <PlayerPageRow
                  key={`${index}-${name}`}
                  name={name}
                  gender={props.genders[index]}
                  showGender={props.variant === "MIXED"}
                  onEdit={() => {
                    setEditIndex(index);
                    setSheetMode("edit");
                  }}
                  onRemove={() => setRemoveIndex(index)}
                />
              );
            })
          )}
        </View>
        {props.hasDuplicateNames ? (
          <Text style={{ color: colors.danger, fontSize: 12 }}>No two players can have the same name.</Text>
        ) : null}
        <PlayerSuggestions
          suggestions={props.allSuggestions}
          usedNames={props.players}
          onSelect={(name) => {
            props.onSelectSuggestion(name);
            pages.goToLastPageForCount(props.players.length + 1);
          }}
        />
      </WizardChrome>

      <AddPlayerSheet
        visible={sheetMode !== null}
        variant={props.variant}
        title={sheetMode === "edit" ? "Edit player" : "Add player"}
        initialName={editIndex !== null ? props.players[editIndex] : ""}
        initialGender={editIndex !== null ? props.genders[editIndex] : undefined}
        onDismiss={() => setSheetMode(null)}
        onSubmit={(name, gender) => {
          if (sheetMode === "edit" && editIndex !== null) {
            props.onUpdatePlayer(editIndex, name, gender);
          } else {
            props.onAddPlayer(name, gender);
            pages.goToLastPageForCount(props.players.length + 1);
          }
          setSheetMode(null);
        }}
      />

      <AlertSheet
        visible={removeIndex !== null}
        variant="warning"
        title="Remove player?"
        message="This player will be removed from the tournament roster."
        primaryAction={{
          label: "Remove",
          destructive: true,
          onPress: () => {
            if (removeIndex !== null) props.onRemovePlayer(removeIndex);
            setRemoveIndex(null);
          }
        }}
        secondaryAction={{ label: "Cancel", onPress: () => setRemoveIndex(null) }}
        onDismiss={() => setRemoveIndex(null)}
      />
    </>
  );
}
