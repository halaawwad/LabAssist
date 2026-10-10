import { useState } from 'react'
import { Plus } from 'lucide-react'
import { SupervisorTopBar } from '../../components/supervisor/SupervisorTopBar'
import { FeaturedProject } from '../../components/supervisor/projects/FeaturedProject'
import { OtherProjectsList } from '../../components/supervisor/projects/OtherProjectsList'
import { ProjectOverviewCard } from '../../components/supervisor/projects/ProjectOverviewCard'
import { UpcomingReviews } from '../../components/supervisor/projects/UpcomingReviews'
import { supervisedProjects, upcomingReviews } from '../../data/supervisor/projectsMockData'

export function MyProjects() {
  const [featuredName, setFeaturedName] = useState(supervisedProjects[0].name)
  const featured = supervisedProjects.find((project) => project.name === featuredName) ?? supervisedProjects[0]
  const others = supervisedProjects.filter((project) => project !== featured)

  return (
    <>
      <SupervisorTopBar />

      <div className="mp-layout">
        <section className="mp-main" aria-labelledby="my-projects-title">
          <header className="mp-heading">
            <div>
              <h1 id="my-projects-title">My Projects</h1>
              <p>Manage and review your supervised projects.</p>
            </div>
            <button className="new-project-button" type="button">
              <Plus size={20} />
              <span>New Project</span>
            </button>
          </header>

          <FeaturedProject project={featured} />
          <OtherProjectsList projects={others} onSelect={setFeaturedName} />
        </section>

        <aside className="mp-side" aria-label="Projects summary">
          <ProjectOverviewCard projects={supervisedProjects} />
          <UpcomingReviews reviews={upcomingReviews} />
        </aside>
      </div>
    </>
  )
}
