const { getDefaultConfig } = require("expo/metro-config");

// Bound transform concurrency on hosts exposing many CPUs but limited memory.
// Keep Expo's monorepo resolution, assets and platform defaults intact.
const config = getDefaultConfig(__dirname);
config.maxWorkers = 1;
module.exports = config;
