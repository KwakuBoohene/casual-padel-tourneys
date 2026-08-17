import { useEffect, useState } from "react";
import type { OrganizerPlayerStatus } from "@padel/shared";

export function usePlayerSelection(status: OrganizerPlayerStatus) {
  const [selecting, setSelecting] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  useEffect(() => {
    setSelecting(false);
    setSelectedIds([]);
  }, [status]);

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
