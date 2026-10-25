import { useState } from 'react'
import { Folder, Plus } from 'lucide-react'
import { useSearchParams } from 'react-router-dom'
import { SupervisorTopBar } from '../../components/supervisor/SupervisorTopBar'
import { FeaturedProject } from '../../components/supervisor/projects/FeaturedProject'
import { OtherProjectsList } from '../../components/supervisor/projects/OtherProjectsList'
import { ProjectOverviewCard } from '../../components/supervisor/projects/ProjectOverviewCard'
import { UpcomingReviews } from '../../components/supervisor/projects/UpcomingReviews'
import { supervisedProjects, upcomingReviews } from '../../data/supervisor/projectsMockData'
import { useI18n } from '../../i18n/i18nContext'
import { ActionDialog } from '../../components/supervisor/tasks/ActionDialog'
import { interactionLabels } from '../../components/supervisor/interactionLabels'
import { useLocalState } from '../../state/useLocalState'

export function MyProjects() {
  const { t, language, formatDate } = useI18n()
  const l = interactionLabels[language]
  const [searchParams, setSearchParams] = useSearchParams()
  const [projects, setProjects] = useLocalState('projects.v1', supervisedProjects)
  const [creating, setCreating] = useState(false)
  const [details, setDetails] = useState(false)
  const [error, setError] = useState('')
  const [featuredName, setFeaturedName] = useState(supervisedProjects[0].name)
  const linked = projects.find((project) => project.code === searchParams.get('project'))
  const featured =
    linked ?? projects.find((project) => project.name === featuredName) ?? projects[0]
  const others = projects.filter((project) => project !== featured)
  const select = (name: string) => {
    setFeaturedName(name)
    setSearchParams({}, { replace: true })
  }

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
            <button
              className="new-project-button"
              type="button"
              onClick={() => {
                setError('')
                setCreating(true)
              }}
            >
              <Plus size={20} />
              <span>{t('projects.newProject')}</span>
            </button>
          </header>

          <FeaturedProject project={featured} onOpen={() => setDetails(true)} />
          <OtherProjectsList projects={others} onSelect={select} />
        </section>

        <aside className="mp-side" aria-label={t('projects.summaryAria')}>
          <ProjectOverviewCard projects={projects} />
          <UpcomingReviews reviews={upcomingReviews} />
        </aside>
      </div>
      {details && (
        <ActionDialog
          title={featured.name}
          description={`${featured.code} · ${featured.team ?? ''}`}
          icon={Folder}
          onClose={() => setDetails(false)}
        >
          <p>
            {t(
              `status.${featured.status === 'On Track' ? 'onTrack' : featured.status === 'Delayed' ? 'delayed' : 'atRisk'}`,
            )}{' '}
            · {featured.progress}%
          </p>
          <p>
            {l.students}: {featured.students}
          </p>
          <p>
            {l.milestone}: {featured.nextMilestone}
          </p>
          <p>
            {l.date}: {formatDate(featured.milestoneDate)}
          </p>
          <p>
            {t('dashboard.stats.issues.label')}: {featured.openIssues}
          </p>
        </ActionDialog>
      )}
      {creating && (
        <ActionDialog
          title={t('projects.newProject')}
          description={l.local}
          icon={Folder}
          submitLabel={t('common.save')}
          onClose={() => setCreating(false)}
          onSubmit={(data) => {
            const code = String(data.get('code')).trim().toUpperCase()
            if (projects.some((project) => project.code.toUpperCase() === code)) {
              setError(l.duplicated)
              return
            }
            const name = String(data.get('name')).trim()
            setProjects((items) => [
              ...items,
              {
                name,
                code,
                team: String(data.get('team')).trim(),
                students: Number(data.get('students')),
                status: 'On Track',
                progress: 0,
                weeklyChange: 0,
                nextMilestone: String(data.get('milestone')).trim(),
                milestoneDate: String(data.get('date')),
                openIssues: 0,
                image: supervisedProjects[0].image,
              },
            ])
            select(name)
            setCreating(false)
          }}
        >
          <label className="dialog-field">
            <span>{l.projectName}</span>
            <input name="name" required maxLength={100} />
          </label>
          <label className="dialog-field">
            <span>{l.code}</span>
            <input name="code" required maxLength={20} />
          </label>
          <label className="dialog-field">
            <span>{l.team}</span>
            <input name="team" required maxLength={60} />
          </label>
          <label className="dialog-field">
            <span>{l.students}</span>
            <input name="students" type="number" min="1" max="20" required defaultValue="3" />
          </label>
          <label className="dialog-field">
            <span>{l.milestone}</span>
            <input name="milestone" required maxLength={100} />
          </label>
          <label className="dialog-field">
            <span>{l.date}</span>
            <input name="date" type="date" required />
          </label>
          {error && <p role="alert">{error}</p>}
        </ActionDialog>
      )}
    </>
  )
}
