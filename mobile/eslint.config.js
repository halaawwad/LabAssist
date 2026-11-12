// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require("eslint/config");
const expoConfig = require("eslint-config-expo/flat");

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ["dist/**", ".expo/**", ".expo-preview/**", ".native-preview-backup/**", ".web-preview-backup/**", ".native-mobile-revision-20261109/**"],
  },
  {
    settings: {
      "import/resolver": {
        typescript: { project: require("node:path").join(__dirname, "tsconfig.json") },
      },
    },
  },
]);
/* global __dirname */
