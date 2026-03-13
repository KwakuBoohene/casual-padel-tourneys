import { SafeAreaView, StatusBar } from "react-native";

import { OrganizerScreen } from "./screens/OrganizerScreen/OrganizerScreen";

export function App() {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#0f172a" }}>
      <StatusBar barStyle="light-content" />
      <OrganizerScreen />
    </SafeAreaView>
  );
}
