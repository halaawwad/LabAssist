import { AppText, Button } from "@/components";
import { Disclosure } from "@/components/Disclosure";
import { kit, Panel, Ring, useCopy } from "@/components/MobileKit";
import { authClient } from "@/features/auth/client";
import { useNativeSession } from "@/state/NativeSession";
import { View } from "react-native";
import { useSupervisedProjects } from "../../../shared/project-work/useSupervisedProjects";

export function SupervisedProjects() {
  const copy = useCopy();
  const { account } = useNativeSession();
  const { projects, loading, failed, reload } = useSupervisedProjects(authClient, account?.id);
  return (
    <View style={kit.stack}>
      <Button
        title={copy("Refresh projects", "تحديث المشاريع")}
        variant="soft"
        onPress={() => void reload()}
      />
      {loading && <AppText>{copy("Loading projects…", "جارٍ تحميل المشاريع…")}</AppText>}
      {failed && (
        <AppText accessibilityRole="alert">
          {copy("Could not load projects.", "تعذّر تحميل المشاريع.")}
        </AppText>
      )}
      {!loading && !failed && projects.length === 0 && (
        <AppText>
          {copy("No assigned projects this term.", "لا توجد مشاريع معيّنة لهذا الفصل.")}
        </AppText>
      )}
      {projects.map((project) => {
        const done = project.tasks.filter((task) => task.status === "DONE").length;
        return (
          <Panel key={project.id} title={project.name || copy("Untitled project", "مشروع بلا اسم")}>
            <AppText>{project.term.name}</AppText>
            <AppText>{project.subtitle}</AppText>
            <Ring value={Math.round((done / Math.max(1, project.tasks.length)) * 100)} />
            <AppText>
              {done}/{project.tasks.length} {copy("tasks complete", "مهام مكتملة")}
            </AppText>
            <Disclosure title={copy("Team", "الفريق")}>
              {project.students.map(({ id, name }) => (
                <AppText key={id}>{name}</AppText>
              ))}
              {project.supervisors.map(({ id, name }) => (
                <AppText key={id}>
                  {copy("Supervisor", "المشرف")} · {name}
                </AppText>
              ))}
            </Disclosure>
            <Disclosure title={copy("Tasks", "المهام")}>
              {project.tasks.map((task) => (
                <AppText key={task.id}>
                  {task.title} ·{" "}
                  {project.students.find(({ id }) => id === task.assignedTo)?.name ??
                    copy("Former teammate", "عضو سابق")}{" "}
                  · {task.status.replaceAll("_", " ")}
                </AppText>
              ))}
            </Disclosure>
            <Disclosure title={copy("Issues", "المشكلات")}>
              {project.issues.map((issue) => (
                <AppText key={issue.id}>
                  {issue.title} · {issue.status}
                  {issue.resolution ? " · " + issue.resolution : ""}
                </AppText>
              ))}
            </Disclosure>
          </Panel>
        );
      })}
    </View>
  );
}
