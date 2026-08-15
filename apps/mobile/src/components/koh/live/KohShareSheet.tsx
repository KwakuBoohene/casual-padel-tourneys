import * as Clipboard from "expo-clipboard";
import { useState } from "react";
import { Pressable, Text, View } from "react-native";

import { BottomSheet, SheetButton } from "../../sheets";
import { radius, spacing, touch } from "../../../theme";
import { useTheme } from "../../../theme/ThemeProvider";

interface KohShareSheetProps {
  visible: boolean;
  spectatorUrl: string;
  onDismiss: () => void;
}

export function KohShareSheet(props: KohShareSheetProps) {
  const { colors } = useTheme();
  const [copied, setCopied] = useState(false);

  return (
    <BottomSheet visible={props.visible} title="Share" onDismiss={props.onDismiss}>
      <View
        style={{
          borderRadius: radius.lg,
          borderWidth: 1,
          borderColor: colors.border,
          padding: spacing.lg,
          gap: spacing.md
        }}
      >
        <Text style={{ color: colors.primary, fontWeight: "700" }}>Spectator</Text>
        <Text style={{ color: colors.text, fontSize: 13 }} numberOfLines={2}>
          {props.spectatorUrl}
        </Text>
        <Pressable
          onPress={async () => {
            await Clipboard.setStringAsync(props.spectatorUrl);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
          }}
          style={{
            minHeight: touch.minSecondary,
            borderRadius: radius.lg,
            borderWidth: 1,
            borderColor: colors.border,
            alignItems: "center",
            justifyContent: "center"
          }}
        >
          <Text style={{ color: colors.text, fontWeight: "600" }}>
            {copied ? "Copied" : "Copy link"}
          </Text>
        </Pressable>
      </View>
      <Text style={{ color: colors.muted, fontSize: 13, lineHeight: 18 }}>
        Read-only live page for phones and the web viewer. Co-admin links ship in a later update.
      </Text>
      <SheetButton label="Done" variant="primary" onPress={props.onDismiss} />
    </BottomSheet>
  );
}
