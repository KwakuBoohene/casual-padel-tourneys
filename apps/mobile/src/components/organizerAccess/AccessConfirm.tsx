import { Modal, Text, View } from "react-native";
import { useTheme } from "../../theme/ThemeProvider";
import { AccessButton } from "./AccessButton";
export function AccessConfirm({
  title,
  description,
  busy,
  onConfirm,
  onCancel
}: {
  title: string;
  description: string;
  busy: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const { colors } = useTheme();
  return (
    <Modal visible transparent animationType="fade" onRequestClose={onCancel}>
      <View
        style={{
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
          padding: 24,
          backgroundColor: "rgba(0,0,0,.65)"
        }}
      >
        <View
          style={{
            width: "100%",
            maxWidth: 440,
            padding: 24,
            borderRadius: 20,
            backgroundColor: colors.surface,
            gap: 16
          }}
        >
          <Text style={{ color: colors.text, fontWeight: "700", fontSize: 22 }}>{title}</Text>
          <Text style={{ color: colors.muted }}>{description}</Text>
          <AccessButton label="Confirm" disabled={busy} onPress={onConfirm} />
          <AccessButton label="Cancel" secondary disabled={busy} onPress={onCancel} />
        </View>
      </View>
    </Modal>
  );
}
