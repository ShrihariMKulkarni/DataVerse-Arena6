import React from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import { ToastProvider } from './context/ToastContext'
import Navbar from './components/Navbar'
import Toast from './components/Toast'
import Login from './pages/Login'
import Register from './pages/Register'
import Dashboard from './pages/Dashboard'
import Leaderboard from './pages/Leaderboard'
import TeamDetail from './pages/TeamDetail'
import EventsHub from './pages/EventsHub'

function ProtectedRoute({ children }) {
  const { isAuthenticated } = useAuth()
  return isAuthenticated ? children : <Navigate to="/login" replace />
}

function AppRoutes() {
  return (
    <div className="cyber-bg min-h-screen">
      <Navbar />
      <Routes>
        {/* Events Hub — the new landing page */}
        <Route path="/" element={<EventsHub />} />
        <Route path="/events" element={<EventsHub />} />

        {/* Auth */}
        <Route path="/login" element={<Login />} />

        {/* Event-scoped routes */}
        <Route path="/event/:eventId/leaderboard" element={<Leaderboard />} />
        <Route path="/event/:eventId/register" element={<Register />} />
        <Route path="/event/:eventId/team/:teamId" element={<TeamDetail />} />
        <Route
          path="/event/:eventId/dashboard"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />

        {/* Legacy routes — redirect non-event-scoped pages to Events Hub */}
        <Route path="/leaderboard" element={<Navigate to="/" replace />} />
        <Route path="/register" element={<Navigate to="/" replace />} />
        <Route path="/dashboard" element={<Navigate to="/" replace />} />
        <Route path="/team/:teamId" element={<TeamDetail />} />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <Toast />
    </div>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider>
          <AppRoutes />
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}
