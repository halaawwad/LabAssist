import { ArrowUpRight, Check, Flag, Zap } from "lucide-react";
import { ProgressRing } from "@/components/ProjectVisuals";
import { project } from "@/lib/projectWorkspace";

export function DashboardBuildCard({
  progress,
  completed,
  total,
  onOpen,
}: {
  progress: number;
  completed: number;
  total: number;
  onOpen: () => void;
}) {
  return (
    <article className="dashboard-build-card">
      <header>
        <span>
          <i />
          {project.status}
        </span>
        <small>{project.name}</small>
      </header>
      <div className="build-card-main">
        <div className="build-circuit-art">
          <svg viewBox="0 0 168 152" aria-hidden="true">
            <g className="build-trace">
              <path d="M84 12V36M12 55H31L46 70M11 113H29L47 95M156 44H136L119 64M157 112H137L119 94M84 140V119" />
            </g>
            <g className="build-trace-flow">
              <path d="M84 12V36M12 55H31L46 70M11 113H29L47 95M156 44H136L119 64M157 112H137L119 94M84 140V119" />
            </g>
            <g className="build-trace-terminals">
              <circle cx="84" cy="12" r="3" />
              <circle cx="12" cy="55" r="3" />
              <circle cx="11" cy="113" r="3" />
              <circle cx="156" cy="44" r="3" />
              <circle cx="157" cy="112" r="3" />
              <circle cx="84" cy="140" r="3" />
            </g>
          </svg>
          <div className="build-progress-chip">
            <i className="build-chip-pins pins-north" />
            <i className="build-chip-pins pins-south" />
            <i className="build-chip-pins pins-west" />
            <i className="build-chip-pins pins-east" />
            <ProgressRing value={progress} size={90} label="Overall project progress">
              <strong>
                {progress}
                <small>%</small>
              </strong>
            </ProgressRing>
          </div>
          <span className="build-floating-zap">
            <Zap size={13} />
          </span>
          <span className="build-floating-check">
            <Check size={12} />
          </span>
        </div>
        <div className="build-card-copy">
          <small>THE BUILD, TAKING SHAPE</small>
          <h2>
            Project
            <br />
            <em>progress.</em>
          </h2>
          <p>
            <strong>{completed}</strong>
            <span>/ {total} tasks complete</span>
          </p>
          <button onClick={onOpen}>
            Explore project <ArrowUpRight size={14} />
          </button>
        </div>
      </div>
      <footer>
        <span>
          <Flag size={12} />
          Milestone {project.milestone} of {project.milestoneCount}
        </span>
        <div aria-hidden="true">
          {Array.from({ length: project.milestoneCount }, (_, index) => (
            <i
              key={index}
              className={
                index < project.milestone - 1
                  ? "is-complete"
                  : index === project.milestone - 1
                    ? "is-current"
                    : ""
              }
            />
          ))}
        </div>
      </footer>
    </article>
  );
}
