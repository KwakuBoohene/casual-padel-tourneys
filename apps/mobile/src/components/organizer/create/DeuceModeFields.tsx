import type { DeuceMode } from "@padel/shared";

import { ScoringModeOptionCard } from "./ScoringModeOptionCard";

interface DeuceModeFieldsProps {
  value: DeuceMode;
  onChange: (value: DeuceMode) => void;
}

const OPTIONS: { value: DeuceMode; title: string; detail: string }[] = [
  { value: "ADVANTAGE", title: "Advantage", detail: "Play until win by 2 points" },
  { value: "GOLDEN", title: "Golden point", detail: "No-ad · deciding point at deuce" },
  { value: "STAR", title: "Star point", detail: "Two deuces, then a final deciding point" }
];

export function DeuceModeFields(props: DeuceModeFieldsProps) {
  return (
    <>
      {OPTIONS.map((option) => (
        <ScoringModeOptionCard
          key={option.value}
          title={option.title}
          lines={[option.detail]}
          selected={props.value === option.value}
          onPress={() => props.onChange(option.value)}
        />
      ))}
    </>
  );
}
