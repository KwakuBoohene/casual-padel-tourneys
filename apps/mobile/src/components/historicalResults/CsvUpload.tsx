import * as DocumentPicker from "expo-document-picker";
import { File } from "expo-file-system";
import { AccessButton } from "../organizerAccess/AccessButton";

export function CsvUpload({
  onFile,
  onError,
  disabled
}: {
  onFile: (text: string, name: string) => void;
  onError: (message: string) => void;
  disabled: boolean;
}) {
  return (
    <AccessButton
      label="Choose CSV file"
      disabled={disabled}
      onPress={() =>
        void (async () => {
          try {
            const result = await DocumentPicker.getDocumentAsync({
              type: ["text/csv", "text/plain", "application/vnd.ms-excel"],
              copyToCacheDirectory: true
            });
            if (result.canceled) return;
            const asset = result.assets[0];
            if ((asset.size ?? 0) > 1048576) throw new Error("Choose a CSV no larger than 1 MB.");
            onFile(await new File(asset.uri).text(), asset.name);
          } catch (error) {
            onError((error as Error).message);
          }
        })()
      }
    />
  );
}
