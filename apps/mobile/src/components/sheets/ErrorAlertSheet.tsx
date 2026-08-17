import { AlertSheet } from "./AlertSheet";

interface ErrorAlertSheetProps {
  visible: boolean;
  title?: string;
  message: string;
  onDismiss: () => void;
  dismissOnOverlay?: boolean;
}

/** Session/API error modal — the shared AlertSheet error variant. */
export function ErrorAlertSheet(props: ErrorAlertSheetProps) {
  return (
    <AlertSheet
      visible={props.visible}
      variant="error"
      title={props.title ?? "Something went wrong"}
      message={props.message}
      primaryAction={{ label: "OK", onPress: props.onDismiss }}
      onDismiss={props.onDismiss}
      dismissOnOverlay={props.dismissOnOverlay}
    />
  );
}
