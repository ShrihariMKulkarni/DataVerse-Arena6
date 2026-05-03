import React, { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { api } from '../utils/api'

function RankBadge({ rank }) {
  if (rank === 1) return <span className="cyber-heading text-base rank-gold">①</span>
  if (rank === 2) return <span className="cyber-heading text-base rank-silver">②</span>
  if (rank === 3) return <span className="cyber-heading text-base rank-bronze">③</span>
  return <span className="cyber-heading text-xs text-cyber-muted">{rank}</span>
}

export default function EventsHub() {
  const { isAuthenticated } = useAuth()
  const { addToast } = useToast()
  const navigate = useNavigate()
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [creating, setCreating] = useState(false)
  const [form, setForm] = useState({ eventName: '', description: '' })
  const [deletingId, setDeletingId] = useState(null)
  const [masterBoard, setMasterBoard] = useState([])
  const [masterLoading, setMasterLoading] = useState(true)

  const fetchEvents = async () => {
    try {
      const data = await api.getEvents()
      setEvents(data.events || [])
    } catch (err) {
      console.error('Failed to load events:', err)
    } finally {
      setLoading(false)
    }
  }

  const fetchMasterBoard = async () => {
    try {
      const data = await api.getMasterLeaderboard()
      setMasterBoard(data.leaderboard || [])
    } catch (err) {
      console.error('Failed to load master leaderboard:', err)
    } finally {
      setMasterLoading(false)
    }
  }

  useEffect(() => {
    fetchEvents()
    fetchMasterBoard()
  }, [])

  const handleCreate = async (e) => {
    e.preventDefault()
    if (!form.eventName.trim()) return
    setCreating(true)
    try {
      await api.createEvent({
        eventName: form.eventName.trim(),
        description: form.description.trim(),
      })
      addToast(`EVENT CREATED: ${form.eventName}`, 'success')
      setForm({ eventName: '', description: '' })
      setShowCreate(false)
      fetchEvents()
    } catch (err) {
      addToast(`FAILED: ${err.message}`, 'error')
    } finally {
      setCreating(false)
    }
  }

  const handleDelete = async (eventId, eventName) => {
    if (!window.confirm(`Are you sure you want to delete "${eventName}"? All teams, scores, and data inside will be permanently lost.`)) return
    setDeletingId(eventId)
    try {
      await api.deleteEvent(eventId)
      addToast(`EVENT DELETED: ${eventName}`, 'success')
      fetchEvents()
      fetchMasterBoard()
    } catch (err) {
      addToast(`DELETE FAILED: ${err.message}`, 'error')
    } finally {
      setDeletingId(null)
    }
  }

  const gradients = [
    { border: '#00ffff', bg: 'rgba(0,255,255,0.03)' },
    { border: '#ff0080', bg: 'rgba(255,0,128,0.03)' },
    { border: '#9d00ff', bg: 'rgba(157,0,255,0.03)' },
    { border: '#00ff88', bg: 'rgba(0,255,136,0.03)' },
    { border: '#f0ff00', bg: 'rgba(240,255,0,0.03)' },
  ]

  const hasScores = masterBoard.some(t => t.totalScore > 0)

  return (
    <div className="min-h-screen px-4 py-16 max-w-6xl mx-auto">
      {/* Header */}
      <div className="text-center mb-12 animate-fade-in-up">
        <div className="flex items-center justify-center gap-3 mb-3">
          <div className="h-px w-16 bg-gradient-to-r from-transparent to-cyber-cyan/50" />
          <span className="cyber-label text-cyber-cyan tracking-widest">EVENT HUB</span>
          <div className="h-px w-16 bg-gradient-to-l from-transparent to-cyber-cyan/50" />
        </div>
        <h1 className="cyber-heading text-4xl neon-text-cyan mb-3 animate-flicker">
          DATAVERSE ARENA
        </h1>
        <p className="font-mono text-sm text-cyber-muted max-w-lg mx-auto">
          Build bold. Innovate fearlessly. Compete with the best minds.
          Your next breakthrough starts here.
        </p>
        <p className="font-mono text-xs text-cyber-muted mt-2">
          DataVerse Club · Sapthagiri NPS University, Bengaluru
        </p>
      </div>

      {/* Create Event Button (judge only) */}
      {isAuthenticated && (
        <div className="text-center mb-8">
          <button
            onClick={() => setShowCreate(v => !v)}
            className="btn-cyber btn-cyber-solid text-xs px-6 py-2.5"
          >
            {showCreate ? '[ CANCEL ]' : '[ + CREATE NEW EVENT ]'}
          </button>
        </div>
      )}

      {/* Create Event Form */}
      {showCreate && isAuthenticated && (
        <div className="max-w-md mx-auto mb-10 animate-fade-in-up">
          <form onSubmit={handleCreate} className="cyber-card hud-corners p-6 space-y-4">
            <h2 className="cyber-heading text-sm neon-text-cyan mb-2">CREATE NEW EVENT</h2>
            <div>
              <label className="cyber-label" htmlFor="eventName">EVENT NAME *</label>
              <input
                id="eventName"
                className="cyber-input"
                placeholder="e.g., Hackverse 2026"
                value={form.eventName}
                onChange={e => setForm(f => ({ ...f, eventName: e.target.value }))}
                required
                maxLength={80}
              />
            </div>
            <div>
              <label className="cyber-label" htmlFor="eventDesc">DESCRIPTION (optional)</label>
              <textarea
                id="eventDesc"
                className="cyber-input min-h-[70px] resize-y"
                placeholder="Brief description of the event..."
                value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                maxLength={300}
              />
            </div>
            <button
              type="submit"
              disabled={creating}
              className="btn-cyber btn-cyber-solid w-full py-2.5 text-sm"
            >
              {creating ? '[ CREATING... ]' : '[ CREATE EVENT ]'}
            </button>
          </form>
        </div>
      )}

      {/* Events Grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {[1, 2, 3].map(i => (
            <div key={i} className="cyber-card p-6 animate-pulse">
              <div className="h-5 bg-cyber-border/30 rounded w-3/4 mb-4" />
              <div className="h-3 bg-cyber-border/20 rounded w-full mb-2" />
              <div className="h-3 bg-cyber-border/20 rounded w-2/3" />
            </div>
          ))}
        </div>
      ) : events.length === 0 ? (
        <div className="cyber-card p-16 text-center max-w-md mx-auto">
          <div className="text-5xl neon-text-cyan opacity-30 mb-4">◈</div>
          <p className="cyber-heading text-sm text-cyber-muted">NO EVENTS YET</p>
          <p className="font-mono text-xs text-cyber-muted mt-3">
            {isAuthenticated
              ? 'Create your first event to get started.'
              : 'Login as a judge to create events.'}
          </p>
          {!isAuthenticated && (
            <Link to="/login" className="btn-cyber text-xs px-4 py-2 mt-4 inline-block">
              JUDGE LOGIN →
            </Link>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {events.map((evt, idx) => {
            const g = gradients[idx % gradients.length]
            return (
              <div
                key={evt.eventId}
                className="cyber-card p-6 relative overflow-hidden group transition-all duration-300 hover:scale-[1.02] animate-fade-in-up"
                style={{
                  borderColor: g.border + '60',
                  background: `linear-gradient(135deg, ${g.bg}, #0d0d20)`,
                  animationDelay: `${idx * 0.1}s`,
                }}
              >
                <div
                  className="absolute top-0 right-0 w-32 h-32 opacity-10 group-hover:opacity-20 transition-opacity"
                  style={{ background: `radial-gradient(circle, ${g.border}, transparent)`, filter: 'blur(25px)' }}
                />
                <div className="relative">
                  <h3
                    className="cyber-heading text-lg mb-2 truncate"
                    style={{ color: g.border, textShadow: `0 0 8px ${g.border}` }}
                  >
                    {evt.eventName}
                  </h3>
                  {evt.description && (
                    <p className="font-mono text-xs text-cyber-muted mb-4 leading-relaxed truncate-2">
                      {evt.description}
                    </p>
                  )}
                  <div className="font-mono text-[0.6rem] text-cyber-muted mb-4">
                    Created: {new Date(evt.createdAt).toLocaleDateString()}
                  </div>
                  <div className="flex gap-2">
                    <Link
                      to={`/event/${evt.eventId}/leaderboard`}
                      className="btn-cyber text-[0.65rem] px-3 py-1.5 flex-1 text-center"
                      style={{ borderColor: g.border, color: g.border }}
                    >
                      OPEN →
                    </Link>
                    {isAuthenticated && (
                      <button
                        onClick={() => handleDelete(evt.eventId, evt.eventName)}
                        disabled={deletingId === evt.eventId}
                        className="btn-cyber btn-cyber-magenta text-[0.65rem] px-3 py-1.5"
                        title="Delete Event"
                      >
                        {deletingId === evt.eventId ? '...' : '✕'}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* ─── MASTER LEADERBOARD ─────────────────────────────── */}
      {!loading && events.length > 0 && (
        <div className="mt-14 animate-fade-in-up" style={{ animationDelay: '0.3s' }}>
          <div className="flex items-center gap-3 mb-6 justify-center">
            <div className="h-px w-16 bg-gradient-to-r from-transparent to-cyber-yellow/50" />
            <span className="cyber-label text-cyber-yellow tracking-widest">MASTER LEADERBOARD</span>
            <div className="h-px w-16 bg-gradient-to-l from-transparent to-cyber-yellow/50" />
          </div>
          <p className="text-center font-mono text-xs text-cyber-muted mb-6">
            Combined scores across all events. Teams with the same name are merged.
          </p>

          {masterLoading ? (
            <div className="space-y-2 max-w-3xl mx-auto">
              {[1, 2, 3].map(i => (
                <div key={i} className="flex items-center gap-4 p-4 border border-cyber-cyan/10 animate-pulse">
                  <div className="cyber-skeleton h-6 w-8 rounded-none" />
                  <div className="cyber-skeleton h-5 w-36 rounded-none" />
                  <div className="cyber-skeleton h-4 w-24 rounded-none flex-1" />
                  <div className="cyber-skeleton h-6 w-16 rounded-none" />
                </div>
              ))}
            </div>
          ) : masterBoard.length === 0 || !hasScores ? (
            <div className="cyber-card p-10 text-center max-w-md mx-auto" style={{ borderColor: 'rgba(240,255,0,0.2)' }}>
              <div className="text-3xl opacity-30 mb-3">🏆</div>
              <p className="cyber-heading text-xs text-cyber-muted">NO SCORES YET</p>
              <p className="font-mono text-[0.65rem] text-cyber-muted mt-2">
                Scores will appear here once judges and AI evaluate teams.
              </p>
            </div>
          ) : (
            <div className="cyber-card overflow-hidden max-w-3xl mx-auto" style={{ borderColor: 'rgba(240,255,0,0.25)' }}>
              <div className="overflow-x-auto">
                <table className="cyber-table">
                  <thead>
                    <tr>
                      <th className="w-12">RANK</th>
                      <th>TEAM</th>
                      <th className="hidden sm:table-cell">EVENTS</th>
                      <th className="text-right font-bold">TOTAL PTS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {masterBoard.filter(t => t.totalScore > 0).map((team, idx) => {
                      const rank = idx + 1
                      return (
                        <tr
                          key={team.teamName + idx}
                          className="transition-all duration-300 hover:bg-cyber-cyan/5"
                        >
                          <td className="w-12">
                            <RankBadge rank={rank} />
                          </td>
                          <td>
                            <div className="cyber-heading text-xs text-cyber-text">{team.teamName}</div>
                            <div className="font-mono text-[0.6rem] text-cyber-muted">{team.leaderName}</div>
                          </td>
                          <td className="hidden sm:table-cell">
                            <div className="flex flex-wrap gap-1">
                              {team.events.map((e, i) => (
                                <span
                                  key={i}
                                  className="inline-block text-[0.55rem] font-mono px-1.5 py-0.5 border border-cyber-cyan/20 text-cyber-muted"
                                  title={`${e.eventName}: ${e.score} pts`}
                                >
                                  {e.eventName.length > 12 ? e.eventName.slice(0, 12) + '…' : e.eventName}
                                  <span className="text-cyber-cyan ml-1">{e.score}</span>
                                </span>
                              ))}
                            </div>
                          </td>
                          <td className="text-right">
                            <span
                              className="cyber-heading text-lg"
                              style={{
                                color: rank === 1 ? '#ffd700' : rank === 2 ? '#c0c0c0' : rank === 3 ? '#cd7f32' : '#00ffff',
                                textShadow: rank <= 3 ? '0 0 10px currentColor' : 'none',
                              }}
                            >
                              {team.totalScore}
                            </span>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      <div className="mt-12 text-center font-mono text-[0.6rem] text-cyber-muted">
        DATAVERSE ARENA · MULTI-EVENT EVALUATION PLATFORM
      </div>
    </div>
  )
}
