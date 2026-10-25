import { Navigate, Route, Routes } from 'react-router-dom'
import { WorkshopLayout } from './layouts/WorkshopLayout'
import { AttendancePage } from './pages/AttendancePage'
import { HandoverPage } from './pages/HandoverPage'
import { MessagesPage } from './pages/MessagesPage'
import { NoticesPage } from './pages/NoticesPage'
import { NotificationsPage } from './pages/NotificationsPage'
import { SettingsPage } from './pages/SettingsPage'
import { SupervisorNotesPage } from './pages/SupervisorNotesPage'
import { WorkshopDashboard } from './pages/WorkshopDashboard'
import { WorkshopMapPage } from './pages/WorkshopMapPage'

function App() {
  return (
    <Routes>
      <Route element={<WorkshopLayout />}>
        <Route path="/dashboard" element={<WorkshopDashboard />} />
        <Route path="/map" element={<WorkshopMapPage />} />
        <Route path="/attendance" element={<AttendancePage />} />
        <Route path="/notices" element={<NoticesPage />} />
        <Route path="/handover" element={<HandoverPage />} />
        <Route path="/supervisor-notes" element={<SupervisorNotesPage />} />
        <Route path="/messages" element={<MessagesPage />} />
        <Route path="/notifications" element={<NotificationsPage />} />
        <Route path="/settings" element={<SettingsPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  )
}

export default App
