import React, { useState } from 'react'
import { useNavigate, Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { api } from '../utils/api'

export default function Login() {
  const { isAuthenticated, login } = useAuth()
  const { addToast } = useToast()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  if (isAuthenticated) return <Navigate to="/dashboard" replace />

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await api.login(email.trim().toLowerCase(), password)
      login({ email: res.email }, res.token)
      addToast('ACCESS GRANTED // WELCOME, JUDGE', 'success')
      navigate('/dashboard')
    } catch (err) {
      setError(err.message || 'AUTHENTICATION FAILED')
      addToast('ACCESS DENIED', 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-16">
      {/* Background glow */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div
          className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full opacity-10"
          style={{ background: 'radial-gradient(circle, #00ffff 0%, transparent 70%)', filter: 'blur(60px)' }}
        />
        <div
          className="absolute bottom-1/4 right-1/4 w-64 h-64 rounded-full opacity-8"
          style={{ background: 'radial-gradient(circle, #ff0080 0%, transparent 70%)', filter: 'blur(50px)' }}
        />
      </div>

      <div className="w-full max-w-md relative">
        {/* Logo / Title */}
        <div className="text-center mb-10">
          <div className="flex justify-center mb-4">
            <svg viewBox="0 0 80 80" className="w-20 h-20 animate-neon-pulse">
              <polygon
                points="40,4 74,22 74,58 40,76 6,58 6,22"
                fill="none" stroke="#00ffff" strokeWidth="2"
                style={{ filter: 'drop-shadow(0 0 8px #00ffff)' }}
              />
              <polygon
                points="40,14 66,28 66,52 40,66 14,52 14,28"
                fill="none" stroke="#ff0080" strokeWidth="1"
                opacity="0.5"
                style={{ filter: 'drop-shadow(0 0 4px #ff0080)' }}
              />
              <text x="40" y="48" textAnchor="middle"
                fontFamily="Orbitron, monospace" fontWeight="800" fontSize="22"
                fill="#00ffff" style={{ filter: 'drop-shadow(0 0 6px #00ffff)' }}>AI</text>
            </svg>
          </div>
          <h1 className="cyber-heading text-2xl neon-text-cyan mb-1 animate-flicker">
            HACK'S AI JUDGE
          </h1>
          <p className="font-mono text-xs text-cyber-muted tracking-widest">
            JUDGE ACCESS TERMINAL // DATAVERSE ARENA
          </p>
          <p className="font-mono text-[0.6rem] text-cyber-muted mt-1">
            DATAVERSE CLUB · SAPTHAGIRI NPS UNIVERSITY
          </p>
        </div>

        {/* Login card */}
        <div className="cyber-card hud-corners p-8 relative">
          {/* Corner decorations */}
          <div className="absolute top-3 right-3 font-mono text-[0.55rem] text-cyber-cyan opacity-40">
            SYS::AUTH_v2
          </div>
          <div className="absolute bottom-3 left-3 font-mono text-[0.55rem] text-cyber-muted opacity-40">
            DATAVERSE_ARENA
          </div>

          <form onSubmit={handleSubmit} id="login-form" className="space-y-5">
            <div>
              <label className="cyber-label" htmlFor="login-email">
                JUDGE EMAIL
              </label>
              <input
                id="login-email"
                type="email"
                className="cyber-input"
                placeholder="judge@example.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </div>

            <div>
              <label className="cyber-label" htmlFor="login-password">
                ACCESS CODE
              </label>
              <input
                id="login-password"
                type="password"
                className="cyber-input"
                placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                autoComplete="current-password"
              />
            </div>

            {error && (
              <div className="cyber-card p-3 border-[#ff3333]/50 bg-[#ff3333]/5">
                <p className="font-mono text-xs text-[#ff3333] flex items-center gap-2">
                  <span>⚠</span> {error}
                </p>
              </div>
            )}

            <button
              type="submit"
              id="login-submit"
              disabled={loading}
              className="btn-cyber btn-cyber-solid w-full py-3 text-sm"
            >
              {loading ? '[ AUTHENTICATING... ]' : '[ INITIALIZE SESSION ]'}
            </button>
          </form>

          <div className="mt-6 pt-5 border-t border-cyber-cyan/10">
            <div className="cyber-divider" />
            <p className="font-mono text-[0.65rem] text-cyber-muted text-center">
              NOT A JUDGE?{' '}
              <a href="/leaderboard" className="text-cyber-cyan hover:underline">
                VIEW LEADERBOARD →
              </a>
            </p>
          </div>
        </div>

        <p className="text-center font-mono text-[0.6rem] text-cyber-muted mt-6 opacity-60">
          UNAUTHORIZED ACCESS IS PROHIBITED // DATAVERSE ARENA
        </p>
      </div>
    </div>
  )
}
