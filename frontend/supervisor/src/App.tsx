import { Navigate, Route, Routes } from 'react-router-dom'
import { RequireSession } from './layouts/supervisor/RequireSession'
import { SupervisorLayout } from './layouts/supervisor/SupervisorLayout'
import { Login } from './pages/auth/Login'
import { SupervisorDashboard } from './pages/supervisor/SupervisorDashboard'
import { MyProjects } from './pages/supervisor/MyProjects'
import { Students } from './pages/supervisor/Students'
import { Progress } from './pages/supervisor/Progress'
import { Tasks } from './pages/supervisor/Tasks'
import { Notifications } from './pages/supervisor/Notifications'
import { Profile } from './pages/supervisor/Profile'
import { Settings } from './pages/supervisor/Settings'

function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/supervisor/dashboard" replace />} />
      <Route path="/login" element={<Login />} />
      <Route
        path="/supervisor"
        element={
          <RequireSession>
            <SupervisorLayout />
          </RequireSession>
        }
      >
        <Route index element={<Navigate to="/supervisor/dashboard" replace />} />
        <Route path="dashboard" element={<SupervisorDashboard />} />
        <Route path="projects" element={<MyProjects />} />
        <Route path="students" element={<Students />} />
        <Route path="progress" element={<Progress />} />
        <Route path="tasks" element={<Tasks />} />
        <Route path="notifications" element={<Notifications />} />
        <Route path="profile" element={<Profile />} />
        <Route path="settings" element={<Settings />} />
      </Route>
      <Route path="*" element={<Navigate to="/supervisor/dashboard" replace />} />
    </Routes>
  )
}

export default App
