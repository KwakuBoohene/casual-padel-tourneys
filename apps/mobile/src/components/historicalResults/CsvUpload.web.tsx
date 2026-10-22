import { Text, View } from "react-native";
import { useTheme } from "../../theme/ThemeProvider";

export function CsvUpload({
  onFile,
  onError,
  disabled
}: {
  onFile: (text: string, name: string) => void;
  onError: (message: string) => void;
  disabled: boolean;
}) {
  const { colors } = useTheme();
  return (
    <View style={{ gap: 8 }}>
      <Text style={{ color: colors.text }}>Choose one event CSV (maximum 1 MB)</Text>
      <input
        type="file"
        aria-label="CSV file"
        accept=".csv,text/csv,text/plain"
        disabled={disabled}
        style={{
          color: colors.text,
          fontSize: 16,
          padding: 14,
          border: `1px solid ${colors.border}`,
          borderRadius: 12,
          maxWidth: "100%"
        }}
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = "";
          if (!file) return;
          if (file.size > 1048576) {
            onError("Choose a CSV no larger than 1 MB.");
            return;
          }
          void file
            .text()
            .then((text) => onFile(text, file.name))
            .catch((error) => onError(String(error)));
        }}
      />
    </View>
  );
}
