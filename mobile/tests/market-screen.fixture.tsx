import { NativeSessionProvider } from "@/state/NativeSession";
import { ProjectWorkspaceProvider } from "@/native/StudentReference";
import { useState } from "react";
import { ScrollView, View } from "react-native";
import { Button } from "@/components";
import { LanguageToggle } from "@/components/LanguageToggle";
import { LanguageProvider } from "@/i18n";
import { WorkspaceProvider } from "@/state/WorkspaceProvider";
import { MarketSessionProvider, unavailableMarketSession } from "@/lib/market/session";
import { CatalogPanel } from "@/features/student/StudentCatalog";
import { InventoryPanel } from "@/features/student/InventoryPanel";

const testSession = {
  getAccessToken: async () => "test-only",
  getCurrentUser: async () => ({ id: "test", role: "STUDENT" }),
};
function Content() {
  const [view, setView] = useState("catalog"),
    [signedIn, setSignedIn] = useState(true);
  return (
    <MarketSessionProvider
      baseUrl="http://market.test"
      session={signedIn ? testSession : unavailableMarketSession}
    >
      <View style={{ flex: 1 }}>
        <LanguageToggle />
        <Button title="Test catalog" onPress={() => setView("catalog")} />
        <Button title="Test inventory" onPress={() => setView("inventory")} />
        <Button
          title="Test no session"
          onPress={() => {
          setSignedIn(false);
          }}
        />
        <Button
          title="Test session catalog"
          onPress={() => {
            setSignedIn(true);
            setView("catalog");
          }}
        />
        <ScrollView>
          {view === "catalog" ? <CatalogPanel /> : view === "inventory" ? <InventoryPanel /> : null}
        </ScrollView>
      </View>
    </MarketSessionProvider>
  );
}
export default function MarketScreenFixture() {
  return (
    <LanguageProvider>
      <WorkspaceProvider>
        <NativeSessionProvider><ProjectWorkspaceProvider><Content /></ProjectWorkspaceProvider></NativeSessionProvider>
      </WorkspaceProvider>
    </LanguageProvider>
  );
}
