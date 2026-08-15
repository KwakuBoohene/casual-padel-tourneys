import { View } from "react-native";

import { spacing } from "../../theme";

import { AuthMethodButton } from "./AuthMethodButton";

interface AuthMethodListProps {
  googleReady: boolean;
  googleLoading: boolean;
  guestLoading: boolean;
  onGoogle: () => void;
  onMagicLink: () => void;
  onPassword: () => void;
  onGuest: () => void;
}

export function AuthMethodList(props: AuthMethodListProps) {
  return (
    <View style={{ width: "100%", gap: spacing.md }}>
      <AuthMethodButton
        label="Continue with Google"
        variant="primary"
        disabled={!props.googleReady || props.googleLoading}
        loading={props.googleLoading || !props.googleReady}
        onPress={props.onGoogle}
      />
      <AuthMethodButton label="Email magic link" onPress={props.onMagicLink} />
      <AuthMethodButton label="Email and password" onPress={props.onPassword} />
      <AuthMethodButton
        label="Continue as guest"
        loading={props.guestLoading}
        disabled={props.guestLoading}
        onPress={props.onGuest}
      />
    </View>
  );
}
