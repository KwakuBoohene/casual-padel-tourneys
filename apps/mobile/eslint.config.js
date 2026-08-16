const { defineConfig } = require("eslint/config");
const expoConfig = require("eslint-config-expo/flat");

module.exports = defineConfig([
  expoConfig,
  {
    ignores: [
      ".expo/**",
      "dist/**",
      "web-build/**",
      "android/**",
      "ios/**",
      "node_modules/**"
    ]
  }
]);
