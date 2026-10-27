import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { ArrowUpRight, Check, Circle, Clock3, ListTodo, Plus, Users } from "lucide-react";
import { TeamPersonalProgress } from "@/components/TeamPersonalProgress";
import { Button } from "@/components/ui/button";
import { teammates, useProjectWorkspace } from "@/lib/projectWorkspace";
import { useStudentProfile } from "@/lib/studentProfile";

export function ProjectTeamTasks() {
  const workspace = useProjectWorkspace(),
    { profile } = useStudentProfile(),
    navigate = useNavigate(),
    [filter, setFilter] = useState("All");
  const members = teammates.map((person, index) => {
    const tasks = workspace.teamTasks.filter((task) => task.owner === index),
      done = person.done + tasks.filter((task) => workspace.completed.includes(task.id)).length,
      total = person.done + person.remaining + Math.max(0, tasks.length - 2);
    return {
      ...person,
      index,
      name: index === 0 ? profile.name : person.name,
      tasks,
      done,
      total,
      progress: Math.round((done / total) * 100),
    };
  });
  return (
    <section className="project-team-studio">
      <header>
        <div>
          <span className="insight-eyebrow">DIFFERENT STRENGTHS · SHARED MOMENTUM</span>
          <h2>The people. The next steps.</h2>
          <p>A clear view of what each teammate is moving forward.</p>
        </div>
        <Button variant="secondary" onClick={() => navigate({ to: "/team" })}>
          <Plus size={14} />
          Manage Tasks
          <ArrowUpRight size={13} />
        </Button>
      </header>
      <div className="project-studio-toolbar">
        <span>
          <Users size={15} />
          {members.length} equal teammates
        </span>
        <div>
          {["All", "Open", "Completed"].map((item) => (
            <button key={item} aria-pressed={filter === item} onClick={() => setFilter(item)}>
              {item}
            </button>
          ))}
        </div>
      </div>
      <div className="project-studio-members">
        {members.map((member) => (
          <article key={member.index} className={`project-studio-member member-${member.index}`}>
            <div className="studio-member-top">
              <span className="studio-avatar">
                {member.index === 0 ? <img src={profile.photo} alt="" /> : member.initials}
              </span>
              <span>
                <h3>{member.name}</h3>
                <small>{member.index === 0 ? "You" : "Teammate"}</small>
              </span>
              <span className="studio-member-number">0{member.index + 1}</span>
            </div>
            <div className="studio-member-progress">
              <TeamPersonalProgress
                value={member.progress}
                label={`${member.name} personal progress`}
              />
              <div>
                <small>PERSONAL PROGRESS</small>
                <strong>
                  {member.done}
                  <span> / {member.total}</span>
                </strong>
                <p>tasks complete</p>
              </div>
            </div>
            <div className="studio-mini-meters" aria-hidden="true">
              {Array.from({ length: 12 }, (_, i) => (
                <i
                  key={i}
                  className={i < Math.round((member.progress / 100) * 12) ? "is-filled" : ""}
                />
              ))}
            </div>
            <div className="studio-task-heading">
              <ListTodo size={14} />
              <h4>Today's tasks</h4>
              <span>
                {member.tasks.filter((task) => workspace.completed.includes(task.id)).length}/
                {member.tasks.length}
              </span>
            </div>
            <div className="studio-task-list">
              {member.tasks
                .filter(
                  (task) =>
                    filter === "All" ||
                    (filter === "Open" && !workspace.completed.includes(task.id)) ||
                    (filter === "Completed" && workspace.completed.includes(task.id)),
                )
                .map((task) => {
                  const done = workspace.completed.includes(task.id);
                  return (
                    <button
                      key={task.id}
                      aria-pressed={done}
                      aria-label={`${done ? "Reopen" : "Complete"} ${task.title}`}
                      className={done ? "is-done" : ""}
                      onClick={() => {
                        workspace.toggleTask(task.id);
                        workspace.logTeamActivity(
                          member.index,
                          `${done ? "Reopened" : "Completed"} “${task.title}”`,
                        );
                      }}
                    >
                      <span className="studio-task-check">
                        {done ? <Check size={12} /> : <Circle size={12} />}
                      </span>
                      <span>
                        <strong>{task.title}</strong>
                        <small>
                          <Clock3 size={10} />
                          {task.due} ·{" "}
                          {done ? "Completed" : task.inProgress ? "In progress" : "To do"}
                        </small>
                      </span>
                    </button>
                  );
                })}
              {!member.tasks.some(
                (task) =>
                  filter === "All" ||
                  (filter === "Open" && !workspace.completed.includes(task.id)) ||
                  (filter === "Completed" && workspace.completed.includes(task.id)),
              ) && <p className="studio-no-tasks">No {filter.toLowerCase()} tasks here.</p>}
            </div>
            <footer>
              <i />
              <span>
                {workspace.teamActivity.find((activity) => activity.owner === member.index)?.text ||
                  "Ready for the next step"}
              </span>
            </footer>
          </article>
        ))}
      </div>
    </section>
  );
}
