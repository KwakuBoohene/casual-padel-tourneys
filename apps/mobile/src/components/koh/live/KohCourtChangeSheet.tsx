import type { KohCourtChange, KohUnit } from "@padel/shared";
import { AlertSheet } from "../../sheets";
import {
  collectHubUnits,
  formatCourtChangeLines
} from "../../../utilities/koh/courtChangeCopy";

interface KohCourtChangeSheetProps {
  visible: boolean;
  change: KohCourtChange | null;
  courts: Array<{ king: KohUnit | null; challenger: KohUnit | null; waiting: KohUnit[] }>;
  onDismiss: () => void;
}

export function KohCourtChangeSheet(props: KohCourtChangeSheetProps) {
  if (!props.change) return null;
  const lines = formatCourtChangeLines(props.change, collectHubUnits(props.courts));
  const message = [lines.upLine, lines.downLine, lines.body].filter(Boolean).join("\n");

  return (
    <AlertSheet
      visible={props.visible}
      variant="info"
      title="Court change"
      message={message}
      primaryAction={{ label: "Got it", onPress: props.onDismiss }}
      onDismiss={props.onDismiss}
      dismissOnOverlay={false}
    />
  );
}
