import { View } from "react-native";

import { BottomSheet, OptionRow } from "../../sheets";
import { spacing } from "../../../theme";
import { CareerOptInRow } from "../../organizer/create/CareerOptInRow";

interface KohLiveOptionsSheetProps {
  visible: boolean;
  ended: boolean;
  onClose: () => void;
  onRank: () => void;
  onRename: () => void;
  onEnd: () => void;
  onHome: () => void;
  contributeToCareerLeaderboard: boolean;
  careerSaving: boolean;
  onSetContributeToCareerLeaderboard: (value: boolean) => void;
}

/**
 * Everything that is not scoring, swapping or sharing. Mirrors the Americano / Mexicano options
 * sheet so the live screens behave the same way across modes.
 */
export function KohLiveOptionsSheet(props: KohLiveOptionsSheetProps) {
  const run = (action: () => void) => () => {
    props.onClose();
    action();
  };

  return (
    <BottomSheet visible={props.visible} title="Options" onDismiss={props.onClose}>
      <View style={{ gap: spacing.sm }}>
        <CareerOptInRow
          value={props.contributeToCareerLeaderboard}
          disabled={props.careerSaving}
          onChange={props.onSetContributeToCareerLeaderboard}
        />
        <OptionRow
          label="Rankings"
          detail="Court standings and ladder"
          onPress={run(props.onRank)}
        />
        <OptionRow
          label="Edit players"
          detail={props.ended ? "Not available after the night ends" : "Rename or replace a partner"}
          disabled={props.ended}
          onPress={run(props.onRename)}
        />
        {!props.ended ? (
          <OptionRow
            label="End night"
            detail="Lock results"
            emphasized
            onPress={run(props.onEnd)}
          />
        ) : null}
        <OptionRow label="Home" detail="Back to tournaments" onPress={run(props.onHome)} />
      </View>
    </BottomSheet>
  );
}
