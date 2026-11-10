import { useFocusEffect } from "expo-router";
import { useCallback, useRef } from "react";
import type { Ga4CreationStep } from "@padel/shared";
import { useOrganizerGa4 } from "../../components/analytics/OrganizerGa4";

export function useGa4Wizard(step: Ga4CreationStep): void {
  const send = useOrganizerGa4();
  const started = useRef(false);
  const reached = useRef(new Set<Ga4CreationStep>());
  useFocusEffect(useCallback(() => {
    if (!started.current) started.current = send({ event: "creation_started" });
    if (started.current && !reached.current.has(step) && send({ event: "creation_step_reached", step }))
      reached.current.add(step);
  }, [send, step]));
}
