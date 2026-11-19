import { useRouter, type Href } from "@/native/router";
import { Platform, RefreshControl } from "react-native";

import { ErrorState, LoadingState, ScreenContainer } from "@/components";
import { Greeting, StatGrid, type StatTone } from "@/components/MobileKit";
import { useWorkspace } from "@/state/WorkspaceProvider";
import { CalendarDays, ClipboardList, Folder, TriangleAlert } from "lucide-react-native";
import { useLanguage } from "@/i18n";
import { colors } from "@/theme";
import type { ActivityStatus, DashboardStatId } from "@/types/supervisor";

import { ActivityCard } from "../components/ActivityCard";
import { MeetingsCard } from "../components/MeetingsCard";
import { ProgressOverviewCard } from "../components/ProgressOverviewCard";
import { SupportCard } from "../components/SupportCard";
import { useSupervisorDashboard } from "../hooks/useSupervisorDashboard";
import { sectionHref, type SupervisorSectionId } from "../navigation";

const statIcons = {
  myProjects: Folder,
  delayed: CalendarDays,
  reports: ClipboardList,
  issues: TriangleAlert,
};
const statTones: Record<"green" | "orange" | "blue" | "red", StatTone> = {
  green: "olive",
  orange: "orange",
  blue: "blue",
  red: "red",
};

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

  // The signed-in workspace account, as on every role's Home (not the mock profile name).
  const { state, actorId } = useWorkspace();
  const userName = state.users.find((user) => user.id === actorId)?.name ?? "";

  return (
    <ScreenContainer
      scroll
      edges={["top"]}
      refreshControl={
        // Pull-to-refresh is native-only; on the web RNW would wrap the list in a second,
        // non-scrolling overflow container.
        data && Platform.OS !== "web" ? (
          <RefreshControl
            refreshing={refreshing}
            onRefresh={refresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        ) : undefined
      }
    >
      {/* Shared Home pattern: greeting with the signed-in user's name, then stats and cards. */}
      <Greeting name={userName} subtitle={t("supervisor.dashboard.subtitle")} />

      {status === "loading" ? <LoadingState message={t("supervisor.dashboard.loading")} /> : null}
      {status === "error" ? <ErrorState onRetry={retry} /> : null}

      {data ? (
        <>
          <StatGrid
            items={data.stats.map((stat) => ({
              id: stat.id,
              icon: statIcons[stat.id],
              tone: statTones[stat.tone],
              value: stat.value,
              label: t(`supervisor.dashboard.stats.${stat.id}.label`),
              note: t(`supervisor.dashboard.stats.${stat.id}.trend`),
              onPress: () => open(statTargets[stat.id]),
            }))}
          />
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
