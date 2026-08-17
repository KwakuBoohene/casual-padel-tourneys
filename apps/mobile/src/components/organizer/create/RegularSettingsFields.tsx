import { Pressable, Text, View } from "react-native";
import type { DeuceMode, RegularSetFormat, TiebreakPoints } from "@padel/shared";
import { gameWinByForDeuceMode } from "@padel/shared";

import { radius, spacing, touch } from "../../../theme";
import { useTheme } from "../../../theme/ThemeProvider";

import { DeuceModeFields } from "./DeuceModeFields";
import { ScoringModeOptionCard } from "./ScoringModeOptionCard";
import { SettingsStepper } from "./SettingsStepper";

interface RegularSettingsFieldsProps {
  setFormat: RegularSetFormat;
  deuceMode: DeuceMode;
  setsToWin: number;
  setTiebreakTo: TiebreakPoints;
  matchTiebreak: boolean;
  onChangeSetFormat: (value: RegularSetFormat) => void;
  onChangeDeuceMode: (value: DeuceMode) => void;
  onChangeSetsToWin: (value: number) => void;
  onChangeSetTiebreakTo: (value: TiebreakPoints) => void;
  onChangeMatchTiebreak: (value: boolean) => void;
}

const SET_FORMATS: { value: RegularSetFormat; title: string; detail: string }[] = [
  { value: "BO3_GAMES", title: "Best of 3 games", detail: "First to 2 games wins the set" },
  { value: "BO5_GAMES", title: "Best of 5 games", detail: "First to 3 games wins the set" },
  { value: "FULL_SET", title: "Full set · first to 6", detail: "Classic set to 6 games" }
];

export function RegularSettingsFields(props: RegularSettingsFieldsProps) {
  const { colors } = useTheme();
  const gameWinBy = gameWinByForDeuceMode(props.deuceMode);
  const fullWinBy2 = props.setFormat === "FULL_SET" && gameWinBy === 2;
  const helper =
    props.setFormat === "FULL_SET"
      ? gameWinBy === 1
        ? "Full set + Golden/Star ends 6–5 max — never 7 games or 6–6."
        : "Advantage: set can end 7–5. At 6–6 play a set tiebreak (not 7–6 in games)."
      : undefined;

  return (
    <View style={{ gap: spacing.md }}>
      <Text style={{ fontSize: 12, fontWeight: "600", color: colors.muted }}>Deuce</Text>
      <DeuceModeFields value={props.deuceMode} onChange={props.onChangeDeuceMode} />

      <Text style={{ fontSize: 12, fontWeight: "600", color: colors.muted }}>Set format</Text>
      {SET_FORMATS.map((format) => (
        <ScoringModeOptionCard
          key={format.value}
          title={format.title}
          lines={[
            format.detail,
            format.value === "FULL_SET" && gameWinBy === 2
              ? "Advantage · 6–6 is a tiebreak"
              : format.value === "FULL_SET"
                ? "Win by 1 ends at 6–5"
                : ""
          ].filter(Boolean)}
          selected={props.setFormat === format.value}
          onPress={() => props.onChangeSetFormat(format.value)}
        />
      ))}

      <SettingsStepper
        label="Number of sets"
        value={props.setsToWin}
        min={1}
        max={5}
        onChange={props.onChangeSetsToWin}
      />

      {fullWinBy2 ? (
        <SettingsStepper
          label="Set tiebreak to"
          value={props.setTiebreakTo}
          min={7}
          max={10}
          step={3}
          displayValue={`${props.setTiebreakTo} points`}
          onChange={(value) => props.onChangeSetTiebreakTo(value >= 10 ? 10 : 7)}
        />
      ) : null}

      {props.setsToWin > 1 ? (
        <Pressable
          onPress={() => props.onChangeMatchTiebreak(!props.matchTiebreak)}
          style={{
            minHeight: touch.minSecondary,
            padding: spacing.lg,
            borderRadius: radius.lg,
            borderWidth: props.matchTiebreak ? 2 : 1,
            borderColor: props.matchTiebreak ? colors.primary : colors.border,
            backgroundColor: colors.surface,
            gap: 4
          }}
        >
          <Text style={{ color: colors.text, fontWeight: "700", fontSize: 15 }}>
            Match tiebreak if sets even
          </Text>
          <Text style={{ color: colors.muted, fontSize: 13 }}>
            {props.matchTiebreak ? "On — deciding TB when sets finish level" : "Off"}
          </Text>
        </Pressable>
      ) : null}

      {helper ? <Text style={{ color: colors.muted, fontSize: 13, lineHeight: 18 }}>{helper}</Text> : null}
    </View>
  );
}
