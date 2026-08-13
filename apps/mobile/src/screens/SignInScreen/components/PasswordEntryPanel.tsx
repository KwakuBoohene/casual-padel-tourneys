import { Pressable, Text, View } from "react-native";

import { spacing, typography } from "../../../theme";
import { useTheme } from "../../../theme/ThemeProvider";

interface PasswordEntryPanelProps {
  onBack: () => void;
}

/** Shell for ticket 08 password register/login (OPAQUE client). */
export function PasswordEntryPanel(props: PasswordEntryPanelProps) {
  const { colors } = useTheme();

  return (
    <View style={{ width: "100%", gap: spacing.md }}>
      <Pressable onPress={props.onBack}>
        <Text style={{ color: colors.muted, fontWeight: "600" }}>← Back</Text>
      </Pressable>
      <Text style={[typography.sectionTitle, { color: colors.text }]}>Email and password</Text>
      <Text style={{ color: colors.muted, fontSize: 14, lineHeight: 20 }}>
        Password sign-in is next. For now, use Google, a magic link, or continue as guest.
      </Text>
    </View>
  );
}
