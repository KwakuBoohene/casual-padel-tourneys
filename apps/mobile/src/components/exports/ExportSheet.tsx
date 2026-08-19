import { Text, View } from "react-native";

import { BottomSheet, SheetButton } from "../sheets";
import { spacing } from "../../theme";
import { useTheme } from "../../theme/ThemeProvider";
import {
  exportSheetSubtitle,
  type ExportDataset,
  type ExportFormat,
  type ExportRequest
} from "../../utilities/organizer/exportRequests";

interface ExportSheetProps {
  visible: boolean;
  /** Datasets offered, in order. One row of PDF/CSV buttons each. */
  datasets: { dataset: ExportDataset; label: string }[];
  range?: ExportRequest["range"];
  exporting: ExportFormat | null;
  error: string | null;
  onExport: (dataset: ExportDataset, format: ExportFormat) => void;
  onDismiss: () => void;
}

export function ExportSheet(props: ExportSheetProps) {
  const { colors } = useTheme();

  return (
    <BottomSheet visible={props.visible} title="Export" onDismiss={props.onDismiss}>
      {props.error ? (
        <Text style={{ color: colors.danger, fontSize: 13 }}>{props.error}</Text>
      ) : null}
      {props.datasets.map((entry) => (
        <View key={entry.dataset} style={{ gap: spacing.xs }}>
          <Text style={{ color: colors.text, fontSize: 14, fontWeight: "600" }}>{entry.label}</Text>
          <Text style={{ color: colors.muted, fontSize: 12 }}>
            {exportSheetSubtitle({ dataset: entry.dataset, range: props.range })}
          </Text>
          <View style={{ flexDirection: "row", gap: spacing.sm }}>
            {(["pdf", "csv"] as const).map((format) => (
              <SheetButton
                key={format}
                label={props.exporting === format ? "Preparing…" : format.toUpperCase()}
                variant="secondary"
                style={{ flex: 1 }}
                disabled={props.exporting !== null}
                onPress={() => props.onExport(entry.dataset, format)}
              />
            ))}
          </View>
        </View>
      ))}
      <SheetButton label="Close" onPress={props.onDismiss} disabled={props.exporting !== null} />
    </BottomSheet>
  );
}
