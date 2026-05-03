import React, { useState } from 'react'
import { Link, useNavigate, useParams, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function Navbar() {
  const { isAuthenticated, user, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [menuOpen, setMenuOpen] = useState(false)

  // Try to extract eventId from the current URL
  const eventMatch = location.pathname.match(/^\/event\/([^/]+)/)
  const eventId = eventMatch ? eventMatch[1] : null

  const handleLogout = () => {
    logout()
    navigate('/')
  }

  // Event-aware links
  const leaderboardLink = eventId ? `/event/${eventId}/leaderboard` : '/'
  const dashboardLink = eventId ? `/event/${eventId}/dashboard` : '/dashboard'
  const registerLink = eventId ? `/event/${eventId}/register` : '/register'

  return (
    <nav className="sticky top-0 z-50 backdrop-blur-xl border-b border-cyber-cyan/10"
      style={{ background: 'rgba(8,8,26,0.85)' }}
    >
      <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2 group">
          <div
            className="w-8 h-8 rounded-md flex items-center justify-center cyber-heading text-xs neon-text-cyan"
            style={{
              background: 'rgba(0,255,255,0.05)',
              border: '1px solid rgba(0,255,255,0.3)',
              boxShadow: '0 0 10px rgba(0,255,255,0.15)',
            }}
          >
            D·A
          </div>
          <span className="cyber-heading text-sm neon-text-cyan hidden sm:inline group-hover:animate-flicker">
            DATAVERSE ARENA
          </span>
        </Link>

        {/* Desktop Nav */}
        <div className="hidden md:flex items-center gap-1">
          <Link to="/" className="nav-link">EVENTS</Link>
          {eventId && (
            <>
              <Link to={leaderboardLink} className="nav-link">LEADERBOARD</Link>
              <Link to={registerLink} className="nav-link">REGISTER</Link>
            </>
          )}
          {isAuthenticated && (
            <>
              {eventId && (
                <Link to={dashboardLink} className="nav-link text-cyber-magenta">
                  JUDGE PANEL
                </Link>
              )}
              <span className="font-mono text-[0.6rem] text-cyber-muted px-2">
                {user?.email}
              </span>
              <button
                onClick={handleLogout}
                className="btn-cyber text-[0.6rem] px-3 py-1.5 ml-1"
              >
                LOGOUT
              </button>
            </>
          )}
          {!isAuthenticated && (
            <Link to="/login" className="btn-cyber text-[0.6rem] px-3 py-1.5">
              JUDGE LOGIN
            </Link>
          )}
        </div>

        {/* Mobile Menu Toggle */}
        <button
          className="md:hidden btn-cyber text-[0.6rem] px-2 py-1.5"
          onClick={() => setMenuOpen(v => !v)}
        >
          {menuOpen ? '✕' : '☰'}
        </button>
      </div>

      {/* Mobile Menu */}
      {menuOpen && (
        <div className="md:hidden px-4 pb-4 border-t border-cyber-cyan/10 space-y-2 pt-2 animate-fade-in-up"
          style={{ background: 'rgba(8,8,26,0.95)' }}
        >
          <Link to="/" className="mobile-nav-link" onClick={() => setMenuOpen(false)}>EVENTS</Link>
          {eventId && (
            <>
              <Link to={leaderboardLink} className="mobile-nav-link" onClick={() => setMenuOpen(false)}>LEADERBOARD</Link>
              <Link to={registerLink} className="mobile-nav-link" onClick={() => setMenuOpen(false)}>REGISTER</Link>
            </>
          )}
          {isAuthenticated ? (
            <>
              {eventId && (
                <Link to={dashboardLink} className="mobile-nav-link text-cyber-magenta" onClick={() => setMenuOpen(false)}>JUDGE PANEL</Link>
              )}
              <span className="font-mono text-[0.6rem] text-cyber-muted block px-2">{user?.email}</span>
              <button onClick={() => { handleLogout(); setMenuOpen(false) }}
                className="btn-cyber text-[0.6rem] w-full py-2">LOGOUT</button>
            </>
          ) : (
            <Link to="/login" className="btn-cyber text-[0.6rem] w-full py-2 text-center block" onClick={() => setMenuOpen(false)}>
              JUDGE LOGIN
            </Link>
          )}
        </div>
      )}
    </nav>
  )
}
