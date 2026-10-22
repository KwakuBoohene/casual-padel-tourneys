import { Modal, ScrollView, Text, TextInput, View } from "react-native";
import { useState } from "react";
import type { HistoricalMetadata, HistoricalMapping, HistoricalPreview } from "@padel/shared";
import { AccessButton } from "../organizerAccess/AccessButton";
import { useTheme } from "../../theme/ThemeProvider";

export function ImportField({
  label,
  value,
  onChange,
  disabled = false,
  multiline = false
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  multiline?: boolean;
}) {
  const { colors } = useTheme();
  return (
    <View style={{ gap: 6 }}>
      <Text style={{ color: colors.muted }}>{label}</Text>
      <TextInput
        accessibilityLabel={label}
        value={value}
        onChangeText={onChange}
        editable={!disabled}
        multiline={multiline}
        autoCapitalize="none"
        style={{
          color: colors.text,
          borderWidth: 1,
          borderColor: colors.border,
          borderRadius: 12,
          padding: 12,
          minHeight: 48
        }}
      />
    </View>
  );
}
export function MetadataFields({
  value,
  onChange,
  correction,
  disabled
}: {
  value: HistoricalMetadata;
  onChange: (next: HistoricalMetadata) => void;
  correction: boolean;
  disabled: boolean;
}) {
  const { colors } = useTheme();
  return (
    <View style={{ gap: 14 }}>
      <ImportField
        label="Event reference (prevents duplicate imports)"
        value={value.eventKey}
        disabled={correction || disabled}
        onChange={(eventKey) => onChange({ ...value, eventKey })}
      />
      <ImportField
        label="Tournament name"
        value={value.title}
        disabled={disabled}
        onChange={(title) => onChange({ ...value, title })}
      />
      <ImportField
        label="Event date (YYYY-MM-DD)"
        value={value.eventDate}
        disabled={disabled}
        onChange={(eventDate) => onChange({ ...value, eventDate })}
      />
      <Text style={{ color: colors.muted }}>Tournament mode (confirm this from your event)</Text>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
        {(
          [
            ["AMERICANO", "Americano"],
            ["MEXICANO", "Mexicano"],
            ["KING_OF_THE_COURT", "King of the Court"]
          ] as const
        ).map(([mode, label]) => (
          <AccessButton
            key={mode}
            label={label}
            secondary={value.mode !== mode}
            disabled={disabled}
            onPress={() => onChange({ ...value, mode })}
          />
        ))}
      </View>
      <Text style={{ color: colors.muted }}>Variant</Text>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
        {(
          [
            ["", "Not recorded"],
            ["CLASSIC", "Classic"],
            ["TEAM", "Team"],
            ["MIXED", "Mixed"]
          ] as const
        ).map(([variant, label]) => (
          <AccessButton
            key={label}
            label={label}
            secondary={value.variant !== variant}
            disabled={disabled}
            onPress={() => onChange({ ...value, variant })}
          />
        ))}
      </View>
      <Text style={{ color: colors.text }}>
        Scoring: {value.scoringMode === "REGULAR" ? "Regular (games and sets)" : "Americano rally points"} ·
        taken from CSV
      </Text>
    </View>
  );
}
export function MappingFields({
  preview,
  mappings,
  onChange,
  disabled
}: {
  preview: HistoricalPreview;
  mappings: HistoricalMapping[];
  onChange: (next: HistoricalMapping[]) => void;
  disabled: boolean;
}) {
  const { colors } = useTheme();
  const [editing, setEditing] = useState<number | null>(null),
    [search, setSearch] = useState("");
  const current = mappings.find((row) => row.rowNumber === editing);
  const replace = (change: Partial<HistoricalMapping>) => {
    onChange(
      mappings.map((row) => (row.rowNumber === editing ? { ...row, ...change, reviewed: true } : row))
    );
    setEditing(null);
    setSearch("");
  };
  return (
    <View style={{ gap: 12 }}>
      <Text style={{ color: colors.text, fontSize: 20, fontWeight: "700" }}>Match player identities</Text>
      <Text style={{ color: colors.muted }}>
        Exact matches are suggested. Review nicknames and placeholders; a repeated name may be a different
        person.
      </Text>
      {preview.rows.map((row) => {
        const map = mappings.find((item) => item.rowNumber === row.rowNumber)!;
        return (
          <View
            key={row.rowNumber}
            style={{ padding: 14, gap: 8, borderWidth: 1, borderColor: colors.border, borderRadius: 12 }}
          >
            <Text style={{ color: colors.text, fontWeight: "700" }}>
              {row.rank}. {row.name} · {row.matchesPlayed} played · {row.matchesWon} wins
            </Text>
            <Text style={{ color: map.reviewed ? colors.muted : colors.danger }}>
              {!map.reviewed ? "Review required · " : ""}
              {map.playerId
                ? `Existing: ${preview.players.find((p) => p.id === map.playerId)?.name}`
                : `New: ${map.newName}`}
            </Text>
            <AccessButton
              label={`Choose identity for ${row.name}`}
              secondary
              disabled={disabled}
              onPress={() => setEditing(row.rowNumber)}
            />
            {!map.playerId ? (
              <ImportField
                label={`New player name for ${row.name}`}
                value={map.newName}
                disabled={disabled}
                onChange={(newName) =>
                  onChange(
                    mappings.map((item) => (item.rowNumber === row.rowNumber ? { ...item, newName } : item))
                  )
                }
              />
            ) : null}
          </View>
        );
      })}
      {editing !== null ? (
        <Modal visible transparent animationType="none" onRequestClose={() => setEditing(null)}>
          <View
            style={{
              flex: 1,
              backgroundColor: "#000b",
              justifyContent: "center",
              alignItems: "center",
              padding: 24
            }}
          >
            <View
              style={{
                backgroundColor: colors.surface,
                padding: 24,
                borderRadius: 20,
                width: "100%",
                maxWidth: 520,
                maxHeight: "85%",
                gap: 12
              }}
            >
              <Text style={{ color: colors.text, fontWeight: "700", fontSize: 20 }}>
                Choose player identity
              </Text>
              <ImportField label="Search existing players" value={search} onChange={setSearch} />
              <ScrollView style={{ maxHeight: 300 }} contentContainerStyle={{ gap: 8 }}>
                {preview.players
                  .filter((player) => player.name.toLowerCase().includes(search.toLowerCase()))
                  .map((player) => (
                    <AccessButton
                      key={player.id}
                      label={`Use ${player.name}`}
                      secondary
                      onPress={() => replace({ playerId: player.id })}
                    />
                  ))}
              </ScrollView>
              <AccessButton
                label="Create a separate player"
                onPress={() => replace({ playerId: null, newName: current?.newName ?? "" })}
              />
              <AccessButton label="Cancel identity choice" secondary onPress={() => setEditing(null)} />
            </View>
          </View>
        </Modal>
      ) : null}
    </View>
  );
}
