import { useState } from "react";

import {
  enableCareerShare,
  fetchCareerShare,
  revokeCareerShare,
  rotateCareerShare
} from "../../api/careerShare";

export function useCareerShare() {
  const [visible, setVisible] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const run = async (action: () => Promise<string | null>) => {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      setToken(await action());
    } catch (caught) {
      setError((caught as Error).message || "Something went wrong. Try again.");
    } finally {
      setBusy(false);
    }
  };

  const open = async () => {
    setCopied(false);
    setVisible(true);
    // Re-read on open so the sheet is honest if the link was changed elsewhere.
    await run(fetchCareerShare);
  };

  return {
    visible,
    token,
    busy,
    error,
    copied,
    open,
    close: () => {
      if (!busy) setVisible(false);
    },
    enable: () => run(enableCareerShare),
    rotate: () => run(rotateCareerShare),
    revoke: () => run(revokeCareerShare),
    markCopied: () => setCopied(true)
  };
}
