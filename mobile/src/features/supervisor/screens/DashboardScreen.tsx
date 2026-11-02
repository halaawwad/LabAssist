import { useRouter, type Href } from "expo-router";
import { RefreshControl, StyleSheet, View } from "react-native";

import {
  ErrorState,
  LanguageToggle,
  LoadingState,
  ScreenContainer,
  ScreenHeader,
} from "@/components";
import { useLanguage } from "@/i18n";
import { colors, spacing } from "@/theme";
import type { ActivityStatus, DashboardStatId } from "@/types/supervisor";

import { ActivityCard } from "../components/ActivityCard";
import { MeetingsCard } from "../components/MeetingsCard";
import { ProgressOverviewCard } from "../components/ProgressOverviewCard";
import { StatCard } from "../components/StatCard";
import { SupportCard } from "../components/SupportCard";
import { useSupervisorDashboard } from "../hooks/useSupervisorDashboard";
import { sectionHref, type SupervisorSectionId } from "../navigation";

function partOfDay(date: Date) {
  const hour = date.getHours();
  if (hour < 12) return "morning";
  if (hour < 18) return "afternoon";
  return "evening";
}

/** A tab route, or a section that lives under "More". */
type Target = { tab: Href } | { section: SupervisorSectionId };

// Where each card leads, following the links on the web dashboard.
const statTargets: Record<DashboardStatId, Target> = {
  myProjects: { tab: "/supervisor/projects" },
  delayed: { section: "progress" },
  reports: { tab: "/supervisor/reports" },
  issues: { section: "issues" },
};

const activityTargets: Record<ActivityStatus, Target> = {
  report: { tab: "/supervisor/reports" },
  task: { section: "tasks" },
  model: { tab: "/supervisor/projects" },
};

export function DashboardScreen() {
  const { t } = useLanguage();
  const router = useRouter();
  const { status, data, refreshing, refresh, retry } = useSupervisorDashboard();

  const open = (target: Target) => {
    if ("tab" in target) {
      router.navigate(target.tab);
    } else {
      // Sections open with the More list underneath, so back returns there.
      router.push(sectionHref(target.section), { withAnchor: true });
    }
  };

  const firstName = data?.profile.name.trim().split(/\s+/)[0];

  return (
    <ScreenContainer
      scroll
      edges={["top"]}
      refreshControl={
        data ? (
          <RefreshControl
            refreshing={refreshing}
            onRefresh={refresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        ) : undefined
      }
    >
      <ScreenHeader
        eyebrow={t(`supervisor.dashboard.greeting.${partOfDay(new Date())}`)}
        title={
          firstName
            ? t("supervisor.dashboard.honorific", { name: firstName })
            : t("supervisor.nav.dashboard")
        }
        subtitle={t("supervisor.dashboard.subtitle")}
        trailing={<LanguageToggle compact />}
      />

      {status === "loading" ? <LoadingState message={t("supervisor.dashboard.loading")} /> : null}
      {status === "error" ? <ErrorState onRetry={retry} /> : null}

      {data ? (
        <>
          <View style={styles.stats}>
            {data.stats.map((stat) => (
              <StatCard key={stat.id} stat={stat} onPress={() => open(statTargets[stat.id])} />
            ))}
          </View>
          <ProgressOverviewCard
            progress={data.progress}
            onViewAll={() => open({ section: "progress" })}
          />
          <MeetingsCard meetings={data.meetings} onOpen={() => open({ section: "meetings" })} />
          <ActivityCard
            activities={data.activities}
            onViewAll={() => open({ section: "students" })}
            onOpenActivity={(activityStatus) => open(activityTargets[activityStatus])}
          />
          <SupportCard onOpen={() => open({ tab: "/supervisor/projects" })} />
        </>
      ) : null}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  stats: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.md,
  },
});
