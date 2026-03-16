import { Platform, SafeAreaView, StatusBar } from "react-native";

import { OrganizerScreen } from "./screens/OrganizerScreen/OrganizerScreen";

export function App() {
  const androidTopInset = Platform.OS === "android" ? (StatusBar.currentHeight ?? 0) : 0;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#0f172a", paddingTop: androidTopInset }}>
      <StatusBar barStyle="light-content" />
      <OrganizerScreen />
    </SafeAreaView>
  );
}
