import { ActivityPanel } from '../../components/supervisor/ActivityPanel'
import { DashboardHeader } from '../../components/supervisor/DashboardHeader'
import { HardwareSupportCard } from '../../components/supervisor/HardwareSupportCard'
import { ProgressOverview } from '../../components/supervisor/ProgressOverview'
import { StatCard } from '../../components/supervisor/StatCard'
import { stats } from '../../data/supervisor/supervisorMockData'
import { useI18n } from '../../i18n/i18nContext'
import './dashboard.css'

export function SupervisorDashboard() {
  const { t } = useI18n()

  return (
    <div className="dashboard-page">
      <div className="dashboard-atmosphere" aria-hidden="true">
        <svg viewBox="0 0 1600 1000" preserveAspectRatio="none">
          <defs>
            <linearGradient id="dashboard-silk" x2="1" y2="1">
              <stop stopColor="#fffdf5" stopOpacity=".8" />
              <stop offset=".5" stopColor="#a9b48c" stopOpacity=".22" />
              <stop offset="1" stopColor="#fff7e3" stopOpacity=".65" />
            </linearGradient>
          </defs>
          <path
            fill="url(#dashboard-silk)"
            d="M-100 30 Q100 -60 250 50 T570 110 Q700 200 820 30 L940 -90 L-100 -90Z"
          />
          <path
            fill="#fffaf0"
            fillOpacity=".55"
            d="M-50 175 Q140 95 310 200 T610 200 Q800 110 1010 220 T1650 270 L1650 360 Q1450 260 1250 310 T840 270 Q650 230 490 290 T-50 260Z"
          />
          <path
            fill="url(#dashboard-silk)"
            d="M-70 670 Q100 730 280 690 T650 790 Q870 830 1050 710 T1670 780 L1670 920 Q1380 770 1170 900 T760 900 Q550 800 350 860 T-70 790Z"
          />
          <path
            fill="#fffaf0"
            fillOpacity=".65"
            d="M-70 840 Q110 960 340 890 T730 970 Q970 1040 1190 930 T1670 900 L1670 1100 L-70 1100Z"
          />
          <path
            className="dashboard-ribbon-light"
            d="M-60 760 Q140 620 380 780 T850 810 T1330 820 T1660 730"
          />
          <path
            className="dashboard-ribbon-light"
            d="M-60 30 Q140 -60 300 70 T660 100 Q770 180 910 -60"
          />
        </svg>
        <i className="dashboard-firefly firefly-one" />
        <i className="dashboard-firefly firefly-two" />
        <i className="dashboard-firefly firefly-three" />
      </div>
      <div className="dashboard-main">
        <DashboardHeader />

        <section className="stats-grid" aria-label={t('dashboard.statsAria')}>
          {stats.map((stat) => (
            <StatCard key={stat.id} stat={stat} />
          ))}
        </section>

        <section className="dashboard-grid" aria-label={t('dashboard.detailsAria')}>
          <div className="main-stack">
            <ProgressOverview />
            <ActivityPanel />
          </div>
        </section>
      </div>
      <HardwareSupportCard />
    </div>
  )
}
