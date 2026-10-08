import { Navigate, Route, Routes } from 'react-router-dom'
import { SupervisorLayout } from './layouts/supervisor/SupervisorLayout'
import { SupervisorDashboard } from './pages/supervisor/SupervisorDashboard'
import { MyProjects } from './pages/supervisor/MyProjects'
import { Students } from './pages/supervisor/Students'
import { Progress } from './pages/supervisor/Progress'
import { Tasks } from './pages/supervisor/Tasks'

function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/supervisor/dashboard" replace />} />
      <Route path="/supervisor" element={<SupervisorLayout />}>
        <Route index element={<Navigate to="/supervisor/dashboard" replace />} />
        <Route path="dashboard" element={<SupervisorDashboard />} />
        <Route path="projects" element={<MyProjects />} />
        <Route path="students" element={<Students />} />
        <Route path="progress" element={<Progress />} />
        <Route path="tasks" element={<Tasks />} />
      </Route>
      <Route path="*" element={<Navigate to="/supervisor/dashboard" replace />} />
    </Routes>
  )
}

export default App
