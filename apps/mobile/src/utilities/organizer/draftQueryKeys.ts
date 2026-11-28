import { getOrganizerScope } from "../../api/organizerContext";

export const draftQueryKeys = {
  all: ["drafts"] as const,
  list: () => [...draftQueryKeys.all, ...getOrganizerScope(), "list"] as const,
  detail: (id: string) => [...draftQueryKeys.all, ...getOrganizerScope(), "detail", id] as const
};
