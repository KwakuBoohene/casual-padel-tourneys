import { ErrorAlertSheet } from "../sheets";

interface AuthErrorSheetProps {
  visible: boolean;
  title?: string;
  message: string;
  onDismiss: () => void;
}

/** Auth-facing error sheet — shared AlertSheet error variant. */
export function AuthErrorSheet(props: AuthErrorSheetProps) {
  return (
    <ErrorAlertSheet
      visible={props.visible}
      title={props.title}
      message={props.message}
      onDismiss={props.onDismiss}
      dismissOnOverlay
    />
  );
}
