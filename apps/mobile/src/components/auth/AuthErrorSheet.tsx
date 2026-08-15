import { AlertSheet } from "../../../components/sheets";

interface AuthErrorSheetProps {
  visible: boolean;
  title?: string;
  message: string;
  onDismiss: () => void;
}

/** Auth-facing error sheet — thin wrapper over shared AlertSheet. */
export function AuthErrorSheet(props: AuthErrorSheetProps) {
  return (
    <AlertSheet
      visible={props.visible}
      variant="error"
      title={props.title ?? "Something went wrong"}
      message={props.message}
      primaryAction={{ label: "OK", onPress: props.onDismiss }}
      onDismiss={props.onDismiss}
      dismissOnOverlay
    />
  );
}
