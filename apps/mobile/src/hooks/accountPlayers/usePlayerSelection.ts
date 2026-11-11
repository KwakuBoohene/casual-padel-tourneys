import { useState } from "react";
import type { OrganizerPlayerStatus } from "@padel/shared";

export function usePlayerSelection(status: OrganizerPlayerStatus) {
  const [selecting, setSelecting] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [selectionStatus, setSelectionStatus] = useState(status);

  // Switching between active/archived lists drops any selection made on the old list.
  if (status !== selectionStatus) {
    setSelectionStatus(status);
    setSelecting(false);
    setSelectedIds([]);
  }

  const toggle = (id: string) => {
    setSelectedIds((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id]
    );
  };

  const cancel = () => {
    setSelecting(false);
    setSelectedIds([]);
  };

  return {
    selecting,
    selectedIds,
    start: () => setSelecting(true),
    cancel,
    toggle,
    selectAll: (ids: string[]) => setSelectedIds(ids)
  };
}
