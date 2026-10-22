import { File, Paths } from "expo-file-system";
import * as Sharing from "expo-sharing";
import { Platform } from "react-native";
import { captureOrganizerContext } from "../../api/organizerContext";
export async function downloadHistoricalCsv(csv: string, name: string) {
  const context = captureOrganizerContext();
  if (Platform.OS === "web") {
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = name;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  } else {
    const file = new File(Paths.cache, name);
    file.write(csv);
    if (!(await Sharing.isAvailableAsync())) throw new Error("Sharing is not available on this device.");
    try {
      context.assertCurrent();
    } catch (error) {
      if (file.exists) file.delete();
      throw error;
    }
    await Sharing.shareAsync(file.uri, { mimeType: "text/csv" });
  }
}
