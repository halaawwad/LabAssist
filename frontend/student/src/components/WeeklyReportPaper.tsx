import { useEffect, useState } from "react";
import { CheckCircle2, Clock3, Download, FileText, Paperclip } from "lucide-react";
import { ProgressRing } from "@/components/ProjectVisuals";
import { project, teammates } from "@/lib/projectWorkspace";
import { useStudentProfile } from "@/lib/studentProfile";
import { weekLabel, type WeeklyReport } from "@/lib/reports";

export function WeeklyReportPaper({ report }: { report: WeeklyReport }) {
  const { profile } = useStudentProfile();
  const [animatedProgress, setAnimatedProgress] = useState(0);
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setAnimatedProgress(report.fields.progress);
      return;
    }
    const frame = requestAnimationFrame(() => setAnimatedProgress(report.fields.progress));
    return () => cancelAnimationFrame(frame);
  }, [report.fields.progress]);
  const tasks = report.fields.tasks.split("\n").filter((line) => line.trim());
  return (
    <article className="weekly-report-paper">
      <header className="weekly-paper-heading">
        <div className="weekly-paper-avatar">
          <span>
            {project.name
              .split(" ")
              .map((word) => word[0])
              .slice(0, 2)
              .join("")}
          </span>
        </div>
        <div>
          <p className="weekly-paper-kicker">
            WEEKLY REPORT · {weekLabel(report.week)} · {report.week.slice(0, 4)}
          </p>
          <h2>{project.name}</h2>
          <p className="weekly-paper-project">{project.subtitle}</p>
          <div className="weekly-paper-team">
            {teammates.map((member, index) => (
              <span key={index}>
                <i className={`paper-member-${index}`}>
                  {index === 0 ? <img src={profile.photo} alt="" /> : member.initials}
                </i>
                {index === 0 ? profile.name : member.name}
              </span>
            ))}
          </div>
        </div>
        <span
          className={`weekly-paper-stamp stamp-${report.status.toLowerCase().replaceAll(" ", "-")}`}
        >
          {report.status === "Draft" ? "READY TO SUBMIT" : report.status}
        </span>
      </header>
      <div className="weekly-paper-metrics">
        <ProgressRing value={animatedProgress} size={104} label="Reported project progress">
          <strong>{report.fields.progress}%</strong>
          <small>Progress</small>
        </ProgressRing>
        <div className="weekly-paper-stat stat-tasks">
          <span className="weekly-paper-stat-heading">
            <i>
              <CheckCircle2 size={16} />
            </i>
            Tasks reported
          </span>
          <strong>{tasks.length}</strong>
        </div>
        <div className="weekly-paper-stat stat-delays">
          <span className="weekly-paper-stat-heading">
            <i>
              <Clock3 size={16} />
            </i>
            Delays
          </span>
          <strong>{report.fields.hasDelays ? "Reported" : "None"}</strong>
        </div>
        <div className="weekly-paper-stat stat-files">
          <span className="weekly-paper-stat-heading">
            <i>
              <Paperclip size={16} />
            </i>
            Attachments
          </span>
          <strong>{report.attachments.length}</strong>
        </div>
      </div>
      <div className="weekly-paper-columns">
        <section>
          <h3>Weekly Summary</h3>
          <p dir="auto">{report.fields.work || "No summary added."}</p>
          {report.submittedAt && (
            <small>
              Submitted{" "}
              {new Date(report.submittedAt).toLocaleString("en-US", {
                timeZone: "Asia/Hebron",
                month: "short",
                day: "numeric",
                hour: "numeric",
                minute: "2-digit",
              })}{" "}
              · {report.author}
            </small>
          )}
        </section>
        <section>
          <h3>Next Steps</h3>
          <p dir="auto">{report.fields.plan || "No plan added."}</p>
        </section>
        <section>
          <h3>Progress</h3>
          <p dir="auto">{report.fields.progressNote || "No progress description added."}</p>
        </section>
        <section>
          <h3>Tasks Completed</h3>
          <ul>
            {tasks.map((task, index) => (
              <li key={index}>
                <CheckCircle2 size={14} />
                <span dir="auto">{task}</span>
              </li>
            ))}
          </ul>
        </section>
        <section>
          <h3>Issues & Blockers</h3>
          <p dir="auto">{report.fields.problems || "No problems recorded."}</p>
        </section>
        <section>
          <h3>Delays & Recovery</h3>
          <p dir="auto">
            {report.fields.hasDelays ? report.fields.delayReason : "No delays reported."}
          </p>
          {report.fields.hasDelays && report.fields.delayAction && (
            <p dir="auto">
              <strong>Recovery plan: </strong>
              {report.fields.delayAction}
            </p>
          )}
        </section>
        <section className="weekly-paper-attachments">
          <h3>Attached Files</h3>
          {report.attachments.length ? (
            <div>
              {report.attachments.map((file) => (
                <a key={file.id} href={file.url} download={file.name}>
                  {file.image ? <img src={file.url} alt={file.name} /> : <FileText size={22} />}
                  <span>{file.name}</span>
                  <Download size={17} />
                </a>
              ))}
            </div>
          ) : (
            <p>No attachments added.</p>
          )}
        </section>
        {report.feedback && (
          <section>
            <h3>Supervisor Feedback</h3>
            <blockquote>{report.feedback.text}</blockquote>
            <small>
              {report.feedback.name} · {report.feedback.date}
            </small>
          </section>
        )}
      </div>
    </article>
  );
}
