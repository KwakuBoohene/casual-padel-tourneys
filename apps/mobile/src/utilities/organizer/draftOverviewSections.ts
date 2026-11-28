import type { DraftReadiness, DraftReadinessItem } from "@padel/shared";

import type { CreateWizardStep } from "../../hooks/organizer/useCreateTournament";

export interface DraftOverviewSection {
  key: "setup" | "players" | "settings";
  title: string;
  /** Joined labels of the section's readiness items, or the first missing one. */
  value: string;
  missing: boolean;
  step: CreateWizardStep;
}

const SECTIONS: { key: DraftOverviewSection["key"]; title: string; step: CreateWizardStep; items: DraftReadinessItem["key"][] }[] = [
  { key: "setup", title: "Setup", step: "NAME", items: ["name", "format"] },
  { key: "players", title: "Players", step: "PLAYERS", items: ["players"] },
  { key: "settings", title: "Match settings", step: "SETTINGS", items: ["courts", "scoring"] }
];

/** Overview rows (Figma 04): each opens the wizard step that edits it. */
export function draftOverviewSections(readiness: DraftReadiness): DraftOverviewSection[] {
  return SECTIONS.map((section) => {
    const items = readiness.items.filter((item) => section.items.includes(item.key));
    const firstMissing = items.find((item) => item.status === "missing");
    return {
      key: section.key,
      title: section.title,
      step: section.step,
      missing: Boolean(firstMissing),
      value: firstMissing ? firstMissing.label : items.map((item) => item.label).join(" · ")
    };
  });
}
