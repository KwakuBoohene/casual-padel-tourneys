import { File, Paths } from "expo-file-system";
import * as Sharing from "expo-sharing";
import { Platform } from "react-native";

import { getApiBaseUrl, getAuthToken } from "./client";
import { ApiError } from "./errors";
import {
  exportCacheFileName,
  exportMimeType,
  exportRequestPath,
  type ExportRequest
} from "../utilities/organizer/exportRequests";

/**
 * Download an export and hand it to the platform. Native gets the share sheet; Expo web has no
 * share sheet, so it falls back to a normal browser download.
 */
export async function downloadAndShareExport(
  request: ExportRequest,
  displayName: string,
  now: Date = new Date()
): Promise<void> {
  const url = `${getApiBaseUrl()}${exportRequestPath(request)}`;
  const token = getAuthToken();
  const headers = token ? { Authorization: `Bearer ${token}` } : undefined;

  if (Platform.OS === "web") {
    await downloadInBrowser(url, headers);
    return;
  }

  const fileName = exportCacheFileName(request, displayName, now.toISOString());
  const target = new File(Paths.cache, fileName);
  let file: File;
  try {
    file = await File.downloadFileAsync(url, target, headers ? { headers } : undefined);
  } catch (error) {
    // Never leave a half-written file behind for the share sheet to pick up.
    if (target.exists) target.delete();
    throw new ApiError({ message: (error as Error).message || "Export failed.", status: 0 });
  }

  if (!(await Sharing.isAvailableAsync())) {
    throw new ApiError({ message: "Sharing is not available on this device.", status: 0 });
  }
  await Sharing.shareAsync(file.uri, {
    mimeType: exportMimeType(request.format),
    UTI: request.format === "pdf" ? "com.adobe.pdf" : "public.comma-separated-values-text"
  });
}

/** Web cannot attach an auth header to a plain navigation, so fetch then save the blob. */
async function downloadInBrowser(
  url: string,
  headers: Record<string, string> | undefined
): Promise<void> {
  const response = await fetch(url, { headers });
  if (!response.ok) {
    throw new ApiError({ message: "Export failed. Try again.", status: response.status });
  }
  const objectUrl = URL.createObjectURL(await response.blob());
  const disposition = response.headers.get("content-disposition") ?? "";
  const anchor = document.createElement("a");
  anchor.href = objectUrl;
  anchor.download = /filename="([^"]+)"/.exec(disposition)?.[1] ?? "export";
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(objectUrl);
}
