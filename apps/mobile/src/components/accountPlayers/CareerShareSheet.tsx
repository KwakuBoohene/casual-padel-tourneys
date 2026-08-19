import * as Clipboard from "expo-clipboard";
import { Text, View } from "react-native";

import { BottomSheet, SheetButton } from "../sheets";
import { spacing } from "../../theme";
import { useTheme } from "../../theme/ThemeProvider";
import {
  careerShareBlurb,
  careerShareStatus,
  careerShareUrl,
  careerShareWarning
} from "../../utilities/accountPlayers/careerShareUrl";

interface CareerShareSheetProps {
  visible: boolean;
  viewerBaseUrl: string;
  token: string | null;
  busy: boolean;
  error: string | null;
  copied: boolean;
  onEnable: () => void;
  onRotate: () => void;
  onRevoke: () => void;
  onCopied: () => void;
  onDismiss: () => void;
}

export function CareerShareSheet(props: CareerShareSheetProps) {
  const { colors } = useTheme();
  const status = careerShareStatus(props.token);
  const url = props.token ? careerShareUrl(props.viewerBaseUrl, props.token) : null;

  const copy = async () => {
    if (!url) return;
    await Clipboard.setStringAsync(url);
    props.onCopied();
  };

  return (
    <BottomSheet visible={props.visible} title="Share standings" onDismiss={props.onDismiss}>
      {props.error ? (
        <Text style={{ color: colors.danger, fontSize: 13 }}>{props.error}</Text>
      ) : null}
      <Text style={{ color: colors.muted, fontSize: 13 }}>{careerShareBlurb(status)}</Text>

      {url ? (
        <View style={{ gap: spacing.sm }}>
          <Text selectable style={{ color: colors.text, fontSize: 13 }}>
            {url}
          </Text>
          <SheetButton
            label={props.copied ? "Link copied" : "Copy link"}
            variant="primary"
            disabled={props.busy}
            onPress={copy}
          />
          <Text style={{ color: colors.muted, fontSize: 12 }}>
            {careerShareWarning("replace")}
          </Text>
          <SheetButton
            label={props.busy ? "Working…" : "Replace link"}
            disabled={props.busy}
            onPress={props.onRotate}
          />
          <SheetButton
            label={props.busy ? "Working…" : "Stop sharing"}
            variant="danger"
            disabled={props.busy}
            onPress={props.onRevoke}
          />
        </View>
      ) : (
        <SheetButton
          label={props.busy ? "Creating…" : "Create share link"}
          variant="primary"
          disabled={props.busy}
          onPress={props.onEnable}
        />
      )}

      <SheetButton label="Close" disabled={props.busy} onPress={props.onDismiss} />
    </BottomSheet>
  );
}
