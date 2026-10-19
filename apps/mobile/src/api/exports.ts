import { File, Paths } from "expo-file-system";
import * as Sharing from "expo-sharing";
import { Platform } from "react-native";

import { getApiBaseUrl, getAuthToken } from "./client";
import { ApiError } from "./errors";
import { notifyAuthFailure } from "./sessionExpiry";
import {
  exportCacheFileName,
  exportMimeType,
  exportRequestPath,
  fileNameFromContentDisposition,
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
  const path = exportRequestPath(request);
  const url = `${getApiBaseUrl()}${path}`;
  const token = getAuthToken();
  const headers = token ? { Authorization: `Bearer ${token}` } : undefined;

  const fileName = exportCacheFileName(request, displayName, now.toISOString());

  if (Platform.OS === "web") {
    await downloadInBrowser(path, url, headers, fileName);
    return;
  }

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
  path: string,
  url: string,
  headers: Record<string, string> | undefined,
  fallbackFileName: string
): Promise<void> {
  const response = await fetch(url, { headers });
  if (!response.ok) {
    notifyAuthFailure(path, response.status, Boolean(headers));
    throw new ApiError({ message: "Export failed. Try again.", status: response.status });
  }
  const objectUrl = URL.createObjectURL(await response.blob());
  // The header is only readable when the API exposes it via CORS; fall back to the name we
  // already built rather than letting the browser save a generic "export".
  const fromHeader = fileNameFromContentDisposition(response.headers.get("content-disposition"));
  const anchor = document.createElement("a");
  anchor.href = objectUrl;
  anchor.download = fromHeader ?? fallbackFileName;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(objectUrl);
}
