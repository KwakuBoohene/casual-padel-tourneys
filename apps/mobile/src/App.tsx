import { Platform, SafeAreaView, StatusBar } from "react-native";

import { PageShell } from "./layout";
import { OrganizerScreen } from "./screens/OrganizerScreen/OrganizerScreen";
import { ThemeProvider, useTheme } from "./theme/ThemeProvider";

function AppContent() {
  const { mode, colors } = useTheme();
  const androidTopInset = Platform.OS === "android" ? (StatusBar.currentHeight ?? 0) : 0;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background, paddingTop: androidTopInset }}>
      <StatusBar barStyle={mode === "dark" ? "light-content" : "dark-content"} />
      <PageShell>
        <OrganizerScreen />
      </PageShell>
    </SafeAreaView>
  );
}

export function App() {
  return (
    <ThemeProvider>
      <AppContent />
    </ThemeProvider>
  );
}
