import { useState } from "react";
import { router } from "expo-router";
import { parsePadelMixCode } from "@padel/shared";

import { isEmailVerifyRequired } from "../../api/errors";
import { importPadelMixTournament } from "../../api/tournamentImport";
import type { LiveTournamentState } from "../../types/organizer/tournament";
import { tournamentLivePath } from "../../utilities/organizer/tournamentRoutes";
import { useSubmission } from "../useSubmission";

interface UsePadelMixImportInput {
  adoptTournament: (data: LiveTournamentState, editMode: boolean) => void;
  markEmailVerifyRequired: (dueAt?: number) => void;
}

export interface PadelMixImportForm {
  link: string;
  setLink: (value: string) => void;
  errorText: string;
  importing: boolean;
  canSubmit: boolean;
  submit: () => void;
}

const INVALID_LINK = "That doesn't look like a PadelMix live link. It should look like padelmix.app/live/ABC123.";

export function usePadelMixImport(input: UsePadelMixImportInput): PadelMixImportForm {
  const [link, setLinkValue] = useState("");
  const [errorText, setErrorText] = useState("");
  const submission = useSubmission();

  const setLink = (value: string): void => {
    setLinkValue(value);
    setErrorText("");
  };

  const submit = (): void => {
    if (!parsePadelMixCode(link)) {
      setErrorText(INVALID_LINK);
      return;
    }
    void submission.run(async () => {
      setErrorText("");
      try {
        const response = await importPadelMixTournament(link.trim());
        input.adoptTournament(response.data, false);
        router.replace(tournamentLivePath(response.data.id));
      } catch (error) {
        if (isEmailVerifyRequired(error)) {
          input.markEmailVerifyRequired(error.verifyBy);
          return;
        }
        setErrorText((error as Error).message);
      }
    });
  };

  return {
    link,
    setLink,
    errorText,
    importing: submission.saving,
    canSubmit: link.trim().length > 0 && !submission.saving,
    submit
  };
}
