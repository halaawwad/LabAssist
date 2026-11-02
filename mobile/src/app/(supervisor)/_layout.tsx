import { Tabs } from "expo-router";
import { StyleSheet, View } from "react-native";

import { supervisorTabs } from "@/features/supervisor/navigation";
import { useLanguage } from "@/i18n";
import { colors, fontFamilies } from "@/theme";

// Routes live under supervisor/ so URLs read /supervisor/... like the web portal, and the
// (student) and (workshop) groups can add their own /student/... and /workshop/... routes.
export default function SupervisorLayout() {
  const { t, dir, language } = useLanguage();

  return (
    <View style={[styles.root, { direction: dir }]}>
      <Tabs
        screenOptions={{
          headerShown: false,
          sceneStyle: { backgroundColor: colors.background },
          tabBarActiveTintColor: colors.primary,
          tabBarInactiveTintColor: colors.textMuted,
          tabBarStyle: styles.tabBar,
          tabBarLabelStyle: {
            fontFamily: fontFamilies[language].medium,
            fontSize: 11,
            lineHeight: language === "ar" ? 18 : 14,
          },
        }}
      >
        {supervisorTabs.map((tab) => (
          <Tabs.Screen
            key={tab.id}
            name={tab.route}
            options={{
              title: t(`supervisor.tabs.${tab.id}`),
              tabBarIcon: ({ color, size }) => <tab.icon color={color} size={size} />,
            }}
          />
        ))}
      </Tabs>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  tabBar: {
    backgroundColor: colors.surface,
    borderTopColor: colors.line,
  },
});
