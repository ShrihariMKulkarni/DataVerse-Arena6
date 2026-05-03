import React, { useState, useEffect, useCallback } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { api } from '../utils/api'
import TeamCard from '../components/TeamCard'
import LoadingSkeleton from '../components/LoadingSkeleton'

export default function Dashboard() {
  const { eventId } = useParams()
  const { user } = useAuth()
  const { addToast } = useToast()
  const [teams, setTeams] = useState([])
  const [eventInfo, setEventInfo] = useState(null)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('all') // all | scored | pending
  const [stats, setStats] = useState({ total: 0, aiScored: 0, judgeScored: 0, fullyScored: 0 })
  const [config, setConfig] = useState(null)
  const [savingConfig, setSavingConfig] = useState(false)
  const [regOpen, setRegOpen] = useState(true)

  const fetchTeams = useCallback(async () => {
    try {
      const data = await api.getTeams(eventId)
      setTeams(data.teams || [])
      const t = data.teams || []
      setStats({
        total: t.length,
        aiScored: t.filter(x => x.aiScore?.total_ai_score).length,
        judgeScored: t.filter(x => x.judgeScores?.total).length,
        fullyScored: t.filter(x => x.aiScore?.total_ai_score && x.judgeScores?.total).length,
      })
    } catch (err) {
      addToast(`FAILED TO LOAD TEAMS: ${err.message}`, 'error')
    } finally {
      setLoading(false)
    }
  }, [addToast, eventId])

  useEffect(() => {
    if (eventId) {
      api.getEvent(eventId).then(d => setEventInfo(d.event)).catch(() => {})
    }
    fetchTeams()
    api.getConfig(eventId).then(c => { setConfig(c); setRegOpen(c?.registrationOpen ?? true) }).catch(() => {})
    const interval = setInterval(fetchTeams, 30000) // refresh every 30s
    return () => clearInterval(interval)
  }, [fetchTeams, eventId])

  const toggleRegistration = async () => {
    setSavingConfig(true)
    try {
      await api.updateConfig({ registrationOpen: !regOpen, eventId })
      setRegOpen(v => !v)
      addToast(`REGISTRATION ${!regOpen ? 'OPENED' : 'CLOSED'}`, 'success')
    } catch (err) {
      addToast(`CONFIG UPDATE FAILED: ${err.message}`, 'error')
    } finally {
      setSavingConfig(false)
    }
  }

  const filtered = teams
    .filter(t => {
      if (filter === 'scored') return !!(t.aiScore?.total_ai_score && t.judgeScores?.total)
      if (filter === 'pending') return !(t.aiScore?.total_ai_score && t.judgeScores?.total)
      return true
    })
    .filter(t =>
      !search ||
      t.teamName?.toLowerCase().includes(search.toLowerCase()) ||
      t.projectTitle?.toLowerCase().includes(search.toLowerCase())
    )

  return (
    <div className="min-h-screen px-4 py-10 max-w-7xl mx-auto">
      {/* Back to Events */}
      {eventId && (
        <Link to="/" className="inline-flex items-center gap-2 font-mono text-xs text-cyber-muted hover:text-cyber-cyan transition-colors mb-6">
          ← BACK TO EVENTS
        </Link>
      )}

      {/* Header */}
      <div className="mb-8 animate-fade-in-up">
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <div className="h-px w-8 bg-cyber-magenta" style={{ boxShadow: '0 0 4px #ff0080' }} />
              <span className="cyber-label text-cyber-magenta">ADMIN PANEL</span>
            </div>
            <h1 className="cyber-heading text-3xl neon-text-cyan">
              {eventInfo?.eventName ? `${eventInfo.eventName}` : 'JUDGE DASHBOARD'}
            </h1>
            <p className="font-mono text-xs text-cyber-muted mt-1">
              Logged in as: <span className="text-cyber-cyan">{user?.email}</span>
            </p>
          </div>

          {/* Registration toggle */}
          <button
            onClick={toggleRegistration}
            disabled={savingConfig}
            className={`btn-cyber text-xs px-4 py-2 ${regOpen ? 'btn-cyber-magenta' : ''}`}
          >
            {savingConfig
              ? '[ UPDATING... ]'
              : regOpen
              ? '[ CLOSE REGISTRATION ]'
              : '[ OPEN REGISTRATION ]'}
          </button>
        </div>
      </div>

      {/* Stats bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
        {[
          { label: 'TOTAL TEAMS', value: stats.total, color: 'cyan' },
          { label: 'JUDGE SCORED', value: stats.judgeScored, color: 'magenta' },
          { label: 'AI ANALYZED', value: stats.aiScored, color: 'purple' },
          { label: 'FULLY SCORED', value: stats.fullyScored, color: 'green' },
        ].map(s => (
          <div key={s.label} className="cyber-card p-4 text-center hud-corners">
            <div className="cyber-label mb-1">{s.label}</div>
            <div
              className={`cyber-heading text-3xl neon-text-${s.color}`}
              style={{ textShadow: `0 0 10px var(--cyber-${s.color})` }}
            >
              {s.value}
            </div>
          </div>
        ))}
      </div>

      {/* Controls */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <input
          type="text"
          className="cyber-input flex-1"
          placeholder="SEARCH TEAMS..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          id="dashboard-search"
        />
        <div className="flex gap-2">
          {['all', 'scored', 'pending'].map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`btn-cyber text-[0.6rem] px-3 py-2 ${filter === f ? 'btn-cyber-solid' : ''}`}
            >
              {f.toUpperCase()}
            </button>
          ))}
        </div>
        <button onClick={fetchTeams} className="btn-cyber text-[0.6rem] px-3 py-2">
          ↻ REFRESH
        </button>
      </div>

      {/* Results count */}
      <div className="font-mono text-xs text-cyber-muted mb-4">
        SHOWING {filtered.length} / {teams.length} TEAMS
        {search && ` :: QUERY "${search}"`}
      </div>

      {/* Team grid */}
      {loading ? (
        <LoadingSkeleton type="card" count={6} />
      ) : filtered.length === 0 ? (
        <div className="cyber-card p-16 text-center">
          <div className="text-4xl mb-4 neon-text-cyan opacity-40">◈</div>
          <p className="cyber-heading text-sm text-cyber-muted">NO TEAMS FOUND</p>
          <p className="font-mono text-xs text-cyber-muted mt-2">
            {teams.length === 0 ? 'No teams have registered yet.' : 'Try adjusting your search or filter.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map(team => (
            <TeamCard
              key={team.teamId}
              team={team}
              judgeEmail={user?.email}
              onUpdated={fetchTeams}
              eventId={eventId}
            />
          ))}
        </div>
      )}
    </div>
  )
}
