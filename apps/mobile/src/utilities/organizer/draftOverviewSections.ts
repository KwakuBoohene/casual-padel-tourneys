import type { DraftReadiness, DraftReadinessItem } from "@padel/shared";

import type { CreateWizardStep } from "../../hooks/organizer/useCreateTournament";
import type { KohCreateStep } from "../../types/koh/create";

export interface DraftOverviewSection {
  key: "setup" | "players" | "settings";
  title: string;
  /** Joined labels of the section's readiness items, or the first missing one. */
  value: string;
  missing: boolean;
  step: CreateWizardStep;
  /** The King of the Court wizard step for the same section. */
  kohStep: KohCreateStep;
}

type SectionSpec = Pick<DraftOverviewSection, "key" | "title" | "step" | "kohStep"> & { items: DraftReadinessItem["key"][] };

const SECTIONS: SectionSpec[] = [
  { key: "setup", title: "Setup", step: "NAME", kohStep: "NAME", items: ["name", "format"] },
  { key: "players", title: "Players", step: "PLAYERS", kohStep: "ASSIGN", items: ["players"] },
  { key: "settings", title: "Match settings", step: "SETTINGS", kohStep: "FORMAT", items: ["courts", "scoring"] }
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
      kohStep: section.kohStep,
      missing: Boolean(firstMissing),
      value: firstMissing ? firstMissing.label : items.map((item) => item.label).join(" · ")
    };
  });
}
