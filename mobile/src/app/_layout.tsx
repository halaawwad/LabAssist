import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useURL } from "expo-linking";
import OriginalWebsite from "@/web/OriginalWebsite";
import { targetFromLink } from "@/web/targets";
export default function RootLayout() {
  const url = useURL();
  const target = targetFromLink(url);
  return (
    <>
      {target ? (
        <OriginalWebsite key={target.portal} {...target} />
      ) : (
        <Stack
          screenOptions={{ headerShown: false, contentStyle: { backgroundColor: "#eee8dc" } }}
        />
      )}
      <StatusBar style="dark" />
    </>
  );
}
