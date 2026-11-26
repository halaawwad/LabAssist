import { webClient } from "../../../../../shared/auth/web-session";
import { useSupervisedProjects } from "../../../../../shared/project-work/useSupervisedProjects";
import { useI18n } from "../../i18n/i18nContext";
import { SupervisorTopBar } from "../../components/supervisor/SupervisorTopBar";

export function AssignedProjects() {
  const client = webClient(import.meta.env);
  const { projects, loading, failed, reload } = useSupervisedProjects(client, client.account?.id);
  const { language, t } = useI18n();
  const copy = (en: string, ar: string) => (language === "ar" ? ar : en);
  return (
    <>
      <SupervisorTopBar />
      <section className="mp-main" aria-labelledby="assigned-projects-title">
        <header className="mp-heading">
          <div>
            <h1 id="assigned-projects-title">{t("projects.title")}</h1>
            <p>{t("projects.subtitle")}</p>
          </div>
          <button type="button" className="new-project-button" onClick={() => void reload()}>
            {copy("Refresh", "تحديث")}
          </button>
        </header>
        {loading && <p role="status">{copy("Loading projects…", "جارٍ تحميل المشاريع…")}</p>}
        {failed && <p role="alert">{copy("Could not load projects.", "تعذّر تحميل المشاريع.")}</p>}
        {!loading && !failed && !projects.length && (
          <p>{copy("No assigned projects this term.", "لا توجد مشاريع معيّنة لهذا الفصل.")}</p>
        )}
        {projects.map((project) => {
          const completed = project.tasks.filter((task) => task.status === "DONE").length;
          return (
            <details key={project.id} className="project-overview-card">
              <summary>
                {project.name || copy("Untitled project", "مشروع بلا اسم")} · {completed}/
                {project.tasks.length} {copy("tasks complete", "مهام مكتملة")}
              </summary>
              {project.subtitle && <p>{project.subtitle}</p>}
              {project.abstract && <p>{project.abstract}</p>}
              <p>{project.term.name}</p>
              <h2>{copy("Students", "الطلاب")}</h2>
              <p>{project.students.map(({ name }) => name).join(" · ")}</p>
              <h2>{copy("Supervisors", "المشرفون")}</h2>
              <p>{project.supervisors.map(({ name }) => name).join(" · ")}</p>
              <h2>{copy("Tasks", "المهام")}</h2>
              <ul>
                {project.tasks.map((task) => (
                  <li key={task.id}>
                    {task.title} ·{" "}
                    {project.students.find(({ id }) => id === task.assignedTo)?.name ??
                      copy("Former teammate", "عضو سابق")}{" "}
                    · {task.status.replaceAll("_", " ")}
                  </li>
                ))}
              </ul>
              <h2>{copy("Issues", "المشكلات")}</h2>
              <ul>
                {project.issues.map((issue) => (
                  <li key={issue.id}>
                    {issue.title} · {issue.status} {issue.resolution && <p>{issue.resolution}</p>}
                  </li>
                ))}
              </ul>
            </details>
          );
        })}
      </section>
    </>
  );
}
