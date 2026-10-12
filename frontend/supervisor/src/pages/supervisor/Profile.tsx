import { useState } from 'react'
import { ArrowRight, Folder, GraduationCap, Mail, UserPen, Users, type LucideIcon } from 'lucide-react'
import { Link } from 'react-router-dom'
import { AccountFields } from '../../components/supervisor/account/AccountFields'
import { Notice } from '../../components/supervisor/account/Notice'
import { ProfileAvatar } from '../../components/supervisor/account/ProfileAvatar'
import { useAccountDraft } from '../../components/supervisor/account/useAccountDraft'
import { useNotice } from '../../components/supervisor/account/useNotice'
import { SupervisorTopBar } from '../../components/supervisor/SupervisorTopBar'
import { ActionDialog } from '../../components/supervisor/tasks/ActionDialog'
import { supervisedProjects } from '../../data/supervisor/projectsMockData'
import { useI18n, type TranslationKey } from '../../i18n/i18nContext'
import { useAccount } from '../../state/supervisor/accountContext'

// Counts come from the same mock data as My Projects, so the numbers match across pages.
const projectCount = supervisedProjects.length
const studentCount = supervisedProjects.reduce((sum, project) => sum + project.students, 0)

const supervisionStats: { label: TranslationKey; value: number; icon: LucideIcon; link: TranslationKey; to: string }[] = [
  { label: 'profile.supervisedProjects', value: projectCount, icon: Folder, link: 'profile.viewProjects', to: '/supervisor/projects' },
  { label: 'profile.students', value: studentCount, icon: Users, link: 'profile.viewStudents', to: '/supervisor/students' },
]

export function Profile() {
  const { t } = useI18n()
  const { profile } = useAccount()
  const [editing, setEditing] = useState(false)
  const [notice, setNotice] = useNotice()

  return (
    <>
      <SupervisorTopBar />

      <section className="account-page profile-page" aria-labelledby="profile-title">
        <header className="account-heading">
          <div>
            <h1 id="profile-title">{t('profile.title')}</h1>
            <p>{t('profile.subtitle')}</p>
          </div>
          <button className="new-project-button account-heading-action" type="button" aria-haspopup="dialog" onClick={() => setEditing(true)}>
            <UserPen size={19} aria-hidden="true" />
            <span>{t('profile.edit')}</span>
          </button>
        </header>

        <div className="profile-layout">
          <section className="glass-panel profile-card" aria-label={t('profile.detailsAria')}>
            <ProfileAvatar name={profile.name} photo={profile.photo} size="large" />
            <div className="profile-identity">
              <h2>{t('common.honorific', { name: profile.name })}</h2>
              <p>{t('profile.role')}</p>
            </div>
            <dl className="profile-details">
              <div>
                <dt>
                  <Mail size={22} aria-hidden="true" />
                  {t('account.email')}
                </dt>
                <dd>
                  <span dir="ltr">{profile.email}</span>
                </dd>
              </div>
              <div>
                <dt>
                  <GraduationCap size={22} aria-hidden="true" />
                  {t('account.specialization')}
                </dt>
                <dd>{profile.specialization}</dd>
              </div>
            </dl>
          </section>

          <ul className="profile-stats" aria-label={t('profile.statsAria')}>
            {supervisionStats.map((stat) => (
              <li className="profile-stat" key={stat.label}>
                <span className="tasks-summary-icon" aria-hidden="true">
                  <stat.icon strokeWidth={1.9} />
                </span>
                <strong>{stat.value}</strong>
                <span>{t(stat.label)}</span>
                <Link className="profile-stat-link" to={stat.to}>
                  {t(stat.link)}
                  <ArrowRight size={16} aria-hidden="true" />
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {editing ? (
        <EditProfileDialog
          onClose={() => setEditing(false)}
          onSaved={() => {
            setEditing(false)
            setNotice(t('profile.editDialog.saved'))
          }}
        />
      ) : null}

      <Notice message={notice} />
    </>
  )
}

type EditProfileDialogProps = {
  onClose: () => void
  onSaved: () => void
}

function EditProfileDialog({ onClose, onSaved }: EditProfileDialogProps) {
  const { t } = useI18n()
  const { draft, change, save } = useAccountDraft()

  return (
    <ActionDialog
      title={t('profile.editDialog.title')}
      description={t('profile.editDialog.description')}
      icon={UserPen}
      submitLabel={t('common.save')}
      onSubmit={() => {
        save()
        onSaved()
      }}
      onClose={onClose}
    >
      <AccountFields draft={draft} onChange={change} />
    </ActionDialog>
  )
}
