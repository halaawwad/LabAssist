import { Stack } from "expo-router";

import { colors } from "@/theme";

// Opening a section directly (from the dashboard or a link) still puts the More list underneath.
export const unstable_settings = {
  anchor: "index",
};

export default function MoreLayout() {
  return (
    <Stack
      screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }}
    />
  );
}
