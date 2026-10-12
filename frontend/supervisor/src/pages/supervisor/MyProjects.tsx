import { useState } from 'react'
import { Plus } from 'lucide-react'
import { SupervisorTopBar } from '../../components/supervisor/SupervisorTopBar'
import { FeaturedProject } from '../../components/supervisor/projects/FeaturedProject'
import { OtherProjectsList } from '../../components/supervisor/projects/OtherProjectsList'
import { ProjectOverviewCard } from '../../components/supervisor/projects/ProjectOverviewCard'
import { UpcomingReviews } from '../../components/supervisor/projects/UpcomingReviews'
import { supervisedProjects, upcomingReviews } from '../../data/supervisor/projectsMockData'
import { useI18n } from '../../i18n/i18nContext'

export function MyProjects() {
  const { t } = useI18n()
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
              <h1 id="my-projects-title">{t('projects.title')}</h1>
              <p>{t('projects.subtitle')}</p>
            </div>
            <button className="new-project-button" type="button">
              <Plus size={20} />
              <span>{t('projects.newProject')}</span>
            </button>
          </header>

          <FeaturedProject project={featured} />
          <OtherProjectsList projects={others} onSelect={setFeaturedName} />
        </section>

        <aside className="mp-side" aria-label={t('projects.summaryAria')}>
          <ProjectOverviewCard projects={supervisedProjects} />
          <UpcomingReviews reviews={upcomingReviews} />
        </aside>
      </div>
    </>
  )
}
