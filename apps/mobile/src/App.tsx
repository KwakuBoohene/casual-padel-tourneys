import { SafeAreaView } from "react-native";

import { OrganizerScreen } from "./screens/OrganizerScreen";

export function App() {
  return (
    <SafeAreaView style={{ flex: 1 }}>
      <OrganizerScreen />
    </SafeAreaView>
  );
}
