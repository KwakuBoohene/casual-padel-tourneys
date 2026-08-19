import { useState } from "react";

import { downloadAndShareExport } from "../../api/exports";
import type {
  ExportDataset,
  ExportFormat,
  ExportRequest
} from "../../utilities/organizer/exportRequests";

interface UseLeaderboardExportInput {
  /** Used for the downloaded filename. */
  displayName: string;
  tournamentId?: string;
  range?: ExportRequest["range"];
}

export function useLeaderboardExport(input: UseLeaderboardExportInput) {
  const [visible, setVisible] = useState(false);
  const [exporting, setExporting] = useState<ExportFormat | null>(null);
  const [error, setError] = useState<string | null>(null);

  const open = () => {
    setError(null);
    setVisible(true);
  };

  const close = () => {
    if (exporting) return;
    setVisible(false);
  };

  const run = async (dataset: ExportDataset, format: ExportFormat) => {
    if (exporting) return;
    setError(null);
    setExporting(format);
    try {
      await downloadAndShareExport(
        { dataset, format, tournamentId: input.tournamentId, range: input.range },
        input.displayName
      );
      setVisible(false);
    } catch (caught) {
      setError((caught as Error).message || "Export failed. Try again.");
    } finally {
      setExporting(null);
    }
  };

  return { visible, exporting, error, open, close, run };
}
