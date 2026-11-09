import { lazy, Suspense } from 'react'
import { Navigate, Outlet, Route, Routes, useLocation } from 'react-router-dom'
import { CitizenLayout } from './components/layout/CitizenLayout.jsx'
import { ConsoleShell } from './components/layout/ConsoleShell.jsx'
import { useAuth } from './lib/auth.jsx'
import { Spinner } from './components/ui/Primitives.jsx'

// Citizen-facing core loads eagerly (it is the first impression).
import Home from './pages/citizen/Home.jsx'
import Lodge from './pages/citizen/Lodge.jsx'
import Track from './pages/citizen/Track.jsx'
import Login from './pages/citizen/Login.jsx'
import NotFound from './pages/NotFound.jsx'

// Everything else is code-split: the officer/admin consoles (and the map/chart
// libraries they pull in) only download when the user navigates there.
const Chat = lazy(() => import('./pages/citizen/Chat.jsx'))
const MyComplaints = lazy(() => import('./pages/citizen/MyComplaints.jsx'))
const PublicMap = lazy(() => import('./pages/citizen/PublicMap.jsx'))
const Departments = lazy(() => import('./pages/citizen/Departments.jsx'))
const Help = lazy(() => import('./pages/citizen/Help.jsx'))

const OfficerQueue = lazy(() => import('./pages/officer/OfficerQueue.jsx'))
const OfficerReopened = lazy(() => import('./pages/officer/OfficerReopened.jsx'))
const OfficerMap = lazy(() => import('./pages/officer/OfficerMap.jsx'))
const ComplaintDetail = lazy(() => import('./pages/officer/ComplaintDetail.jsx'))

const AdminOverview = lazy(() => import('./pages/admin/AdminOverview.jsx'))
const AdminComplaints = lazy(() => import('./pages/admin/AdminComplaints.jsx'))
const AdminEscalations = lazy(() => import('./pages/admin/AdminEscalations.jsx'))
const AdminReview = lazy(() => import('./pages/admin/AdminReview.jsx'))
const AdminDepartments = lazy(() => import('./pages/admin/AdminDepartments.jsx'))
const AdminAi = lazy(() => import('./pages/admin/AdminAi.jsx'))
const AdminHeatmap = lazy(() => import('./pages/admin/AdminHeatmap.jsx'))
const AdminSettings = lazy(() => import('./pages/admin/AdminSettings.jsx'))

function PageLoader() {
  return (
    <div className="grid min-h-[60vh] place-items-center">
      <Spinner className="text-ink-faint" />
    </div>
  )
}

function FullScreenLoader() {
  return (
    <div className="grid min-h-dvh place-items-center">
      <Spinner className="text-ink-faint" />
    </div>
  )
}

function RequireRole({ roles }) {
  const { user, ready } = useAuth()
  const location = useLocation()
  if (!ready) return <FullScreenLoader />
  if (!user) return <Navigate to="/login" state={{ from: location.pathname }} replace />
  if (!roles.includes(user.role)) return <Navigate to="/" replace />
  return <Outlet />
}

function RequireAuth() {
  const { user, ready } = useAuth()
  const location = useLocation()
  if (!ready) return <FullScreenLoader />
  if (!user) return <Navigate to="/login" state={{ from: location.pathname }} replace />
  return <Outlet />
}

export function App() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
      <Route element={<CitizenLayout />}>
        <Route index element={<Home />} />
        <Route path="lodge" element={<Lodge />} />
        <Route path="chat" element={<Chat />} />
        <Route path="track" element={<Track />} />
        <Route path="track/:code" element={<Track />} />
        <Route path="map" element={<PublicMap />} />
        <Route path="departments" element={<Departments />} />
        <Route path="help" element={<Help />} />
        <Route element={<RequireAuth />}>
          <Route path="my" element={<MyComplaints />} />
        </Route>
      </Route>

      <Route path="/login" element={<Login />} />

      <Route element={<RequireRole roles={['OFFICER']} />}>
        <Route element={<ConsoleShell variant="officer" />}>
          <Route path="officer" element={<OfficerQueue />} />
          <Route path="officer/reopened" element={<OfficerReopened />} />
          <Route path="officer/map" element={<OfficerMap />} />
          <Route path="officer/c/:id" element={<ComplaintDetail />} />
        </Route>
      </Route>

      <Route element={<RequireRole roles={['ADMIN']} />}>
        <Route element={<ConsoleShell variant="admin" />}>
          <Route path="admin" element={<AdminOverview />} />
          <Route path="admin/complaints" element={<AdminComplaints />} />
          <Route path="admin/escalations" element={<AdminEscalations />} />
          <Route path="admin/review" element={<AdminReview />} />
          <Route path="admin/departments" element={<AdminDepartments />} />
          <Route path="admin/ai" element={<AdminAi />} />
          <Route path="admin/heatmap" element={<AdminHeatmap />} />
          <Route path="admin/settings" element={<AdminSettings />} />
          <Route path="admin/c/:id" element={<ComplaintDetail />} />
        </Route>
      </Route>

      <Route path="*" element={<NotFound />} />
      </Routes>
    </Suspense>
  )
}

export default App
