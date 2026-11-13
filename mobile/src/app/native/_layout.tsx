import { PreferencesProvider } from "@/state/Preferences";
import { Stack } from "expo-router";
import { useFonts } from "expo-font";
import { ActivityIndicator, View } from "react-native";
import { LanguageProvider } from "@/i18n";
import { WorkspaceProvider } from "@/state/WorkspaceProvider";
import { fontAssets } from "@/theme";
import { ProjectWorkspaceProvider } from "@/native/StudentReference";
export default function NativeLayout() {
  const [ready, error] = useFonts(fontAssets);
  if (!ready && !error)
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator color="#526443" />
      </View>
    );
  return (
    <PreferencesProvider>
      <LanguageProvider>
        <WorkspaceProvider>
          <ProjectWorkspaceProvider>
            <Stack screenOptions={{ headerShown: false }} />
          </ProjectWorkspaceProvider>
        </WorkspaceProvider>
      </LanguageProvider>
    </PreferencesProvider>
  );
}
