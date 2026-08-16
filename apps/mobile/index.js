import { registerRootComponent } from "expo";
import { ExpoRoot } from "expo-router";

/**
 * Custom entry so Metro can statically resolve `./app` (monorepo-safe).
 * See Expo Router troubleshooting: EXPO_ROUTER_APP_ROOT / require.context.
 */
export function App() {
  const ctx = require.context("./app");
  return <ExpoRoot context={ctx} />;
}

registerRootComponent(App);
