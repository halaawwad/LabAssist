import { Navigate, Route, Routes } from 'react-router-dom'
import { SupervisorLayout } from './layouts/supervisor/SupervisorLayout'
import { SupervisorDashboard } from './pages/supervisor/SupervisorDashboard'
import { MyProjects } from './pages/supervisor/MyProjects'
import { Students } from './pages/supervisor/Students'

function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/supervisor/dashboard" replace />} />
      <Route path="/supervisor" element={<SupervisorLayout />}>
        <Route index element={<Navigate to="/supervisor/dashboard" replace />} />
        <Route path="dashboard" element={<SupervisorDashboard />} />
        <Route path="projects" element={<MyProjects />} />
        <Route path="students" element={<Students />} />
      </Route>
      <Route path="*" element={<Navigate to="/supervisor/dashboard" replace />} />
    </Routes>
  )
}

export default App
