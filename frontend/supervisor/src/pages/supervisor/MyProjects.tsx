import {
  ChevronRight,
  MoreVertical,
  Plus,
  ShieldCheck,
} from 'lucide-react'
import { ProjectCard } from '../../components/supervisor/projects/ProjectCard'
import { SupervisorTopBar } from '../../components/supervisor/SupervisorTopBar'
import {
  attentionItems,
  overviewItems,
  projects,
  reviewDays,
  supervisionOverviewImage,
} from '../../data/supervisor/supervisorMockData'

export function MyProjects() {
  return (
    <>
      <SupervisorTopBar />

      <div className="projects-layout">
        <section className="projects-main glass-panel" aria-labelledby="my-projects-title">
          <div className="projects-page-heading">
            <div>
              <h1 id="my-projects-title">My Projects</h1>
              <p>Manage and review your supervised projects.</p>
            </div>
            <button className="new-project-button" type="button">
              <Plus size={20} />
              <span>New Project</span>
            </button>
          </div>

          <div className="project-card-grid">
            {projects.map((project) => (
              <ProjectCard project={project} key={project.name} />
            ))}
          </div>

          <div className="projects-lower-grid">
            <section className="projects-attention-panel" aria-labelledby="attention-title">
              <div className="panel-heading">
                <h2 id="attention-title">Projects Needing Attention</h2>
                <button className="text-button view-all-button" type="button">
                  View All
                  <ChevronRight size={17} />
                </button>
              </div>

              <div className="attention-list">
                {attentionItems.map((item) => (
                  <button className="attention-row" type="button" key={item.title}>
                    <span className={`attention-icon tone-${item.tone}`}>
                      <item.icon size={21} />
                    </span>
                    <span>
                      <strong>{item.title}</strong>
                      <small>{item.project}</small>
                    </span>
                    <em className={`attention-due tone-${item.tone}`}>{item.due}</em>
                    <ChevronRight size={19} />
                  </button>
                ))}
              </div>
            </section>

            <section className="project-overview-panel" aria-labelledby="overview-title">
              <h2 id="overview-title">Project Overview</h2>
              <div className="overview-grid">
                {overviewItems.map((item) => (
                  <div className="overview-tile" key={item.label}>
                    <span>
                      <item.icon size={22} />
                    </span>
                    <strong>{item.value}</strong>
                    <small>{item.label}</small>
                  </div>
                ))}
              </div>
              <article
                className="supervision-overview"
                style={{ backgroundImage: `url(${supervisionOverviewImage})` }}
              >
                <span>
                  <ShieldCheck size={25} />
                </span>
                <div>
                  <h3>Supervision Overview</h3>
                  <p>Track progress and keep your projects on schedule.</p>
                </div>
              </article>
            </section>
          </div>
        </section>

        <aside className="upcoming-reviews glass-panel" aria-labelledby="reviews-title">
          <div className="panel-heading">
            <h2 id="reviews-title">Upcoming Reviews</h2>
            <button className="text-button view-all-button" type="button">
              View All
              <ChevronRight size={17} />
            </button>
          </div>

          <div className="review-day-list">
            {reviewDays.map((day) => (
              <section className="review-day" key={day.date}>
                <div className="review-day-heading">
                  <h3>{day.date}</h3>
                  <MoreVertical size={18} />
                </div>
                <div className="review-list">
                  {day.reviews.map((review) => (
                    <article className="review-row" key={`${day.date}-${review.time}`}>
                      <time>{review.time}</time>
                      <div className={`review-copy tone-${review.tone}`}>
                        <strong>{review.title}</strong>
                        <span>{review.project}</span>
                        <small>{review.place}</small>
                      </div>
                    </article>
                  ))}
                </div>
              </section>
            ))}
          </div>
        </aside>
      </div>
    </>
  )
}
