import React, { useState, useEffect, useRef, useCallback } from 'react'
import { Link, useParams } from 'react-router-dom'
import jsPDF from 'jspdf'
import 'jspdf-autotable'
import { api } from '../utils/api'
import { LeaderboardSkeleton } from '../components/LoadingSkeleton'

const POLL_INTERVAL = 8000

function CountUp({ target, duration = 800 }) {
  const [val, setVal] = useState(0)
  const frame = useRef(null)
  useEffect(() => {
    const start = Date.now()
    const run = () => {
      const p = Math.min((Date.now() - start) / duration, 1)
      const eased = 1 - Math.pow(1 - p, 3)
      setVal(Math.round(eased * target))
      if (p < 1) frame.current = requestAnimationFrame(run)
    }
    frame.current = requestAnimationFrame(run)
    return () => cancelAnimationFrame(frame.current)
  }, [target, duration])
  return <>{val}</>
}

function RankBadge({ rank }) {
  if (rank === 1) return (
    <span className="cyber-heading text-xl rank-gold animate-neon-pulse">
      #1 ★
    </span>
  )
  if (rank === 2) return <span className="cyber-heading text-lg rank-silver">#2 ✦</span>
  if (rank === 3) return <span className="cyber-heading text-lg rank-bronze">#3 ◆</span>
  return <span className="cyber-heading text-sm text-cyber-muted">#{rank}</span>
}

function TopThreeCard({ team, rank, index, eventId }) {
  const rankColors = {
    1: { border: '#ffd700', shadow: '0 0 20px rgba(255,215,0,0.5), 0 0 40px rgba(255,215,0,0.2)', bg: 'rgba(255,215,0,0.05)' },
    2: { border: '#c0c0c0', shadow: '0 0 12px rgba(192,192,192,0.4)', bg: 'rgba(192,192,192,0.03)' },
    3: { border: '#cd7f32', shadow: '0 0 12px rgba(205,127,50,0.4)', bg: 'rgba(205,127,50,0.03)' },
  }
  const rc = rankColors[rank] || {}
  const teamLink = eventId ? `/event/${eventId}/team/${team.teamId}` : `/team/${team.teamId}`

  return (
    <div
      className="cyber-card p-6 text-center relative overflow-hidden"
      style={{
        borderColor: rc.border,
        boxShadow: rc.shadow,
        background: `linear-gradient(135deg, ${rc.bg}, #0d0d20)`,
        animationDelay: `${index * 0.15}s`,
      }}
    >
      {/* Rank glow blob */}
      <div
        className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 rounded-full opacity-20"
        style={{ background: `radial-gradient(circle, ${rc.border}, transparent)`, filter: 'blur(20px)' }}
      />

      <div className="relative">
        <div className="mb-3">
          <RankBadge rank={rank} />
        </div>
        <h3 className="cyber-heading text-base text-cyber-text mb-1 truncate">{team.teamName}</h3>
        <p className="font-mono text-xs text-cyber-muted mb-4 truncate-2">{team.projectTitle}</p>

        <div
          className="cyber-heading text-4xl mb-1"
          style={{ color: rc.border, textShadow: rc.shadow }}
        >
          <CountUp target={team.totalScore || 0} />
          <span className="text-cyber-muted text-lg">/100</span>
        </div>

        <div className="flex justify-center gap-4 mt-3 text-xs font-mono">
          <div>
            <div className="cyber-label">JUDGE</div>
            <div className="text-cyber-magenta">{team.judgeScores?.total ?? '—'}/50</div>
          </div>
          <div>
            <div className="cyber-label">AI ANALYSER</div>
            <div className="text-cyber-purple">{team.aiScore?.total_ai_score ?? '—'}/50</div>
          </div>
        </div>

        <Link
          to={teamLink}
          className="btn-cyber text-[0.6rem] px-4 py-1.5 mt-4 inline-block"
          style={{ borderColor: rc.border, color: rc.border }}
        >
          VIEW DETAILS →
        </Link>
      </div>
    </div>
  )
}

export default function Leaderboard() {
  const { eventId } = useParams()
  const [teams, setTeams] = useState([])
  const [eventInfo, setEventInfo] = useState(null)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('all')
  const [lastUpdated, setLastUpdated] = useState(null)
  const [flashIds, setFlashIds] = useState(new Set())
  const prevTeamsRef = useRef([])

  const fetchData = useCallback(async () => {
    try {
      const data = await api.getLeaderboard(eventId)
      const newTeams = data.teams || []

      // Detect rank changes to flash
      const flashes = new Set()
      prevTeamsRef.current.forEach((prev, prevIdx) => {
        const newIdx = newTeams.findIndex(t => t.teamId === prev.teamId)
        if (newIdx !== -1 && newIdx !== prevIdx) flashes.add(prev.teamId)
      })
      if (flashes.size > 0) {
        setFlashIds(flashes)
        setTimeout(() => setFlashIds(new Set()), 1500)
      }

      prevTeamsRef.current = newTeams
      setTeams(newTeams)
      setLastUpdated(new Date())
    } catch (_) {}
    finally { setLoading(false) }
  }, [eventId])

  useEffect(() => {
    if (eventId) {
      api.getEvent(eventId).then(d => setEventInfo(d.event)).catch(() => {})
    }
    fetchData()
    const id = setInterval(fetchData, POLL_INTERVAL)
    return () => clearInterval(id)
  }, [fetchData, eventId])

  const exportPDF = () => {
    const doc = new jsPDF()
    const eventName = eventInfo?.eventName || 'DATAVERSE ARENA'
    
    // Header
    doc.setFontSize(18)
    doc.setTextColor(0, 255, 255) // Cyan
    doc.text(`Leaderboard - ${eventName}`, 14, 20)
    
    doc.setFontSize(10)
    doc.setTextColor(100, 100, 100)
    doc.text(`Event ID: ${eventId || 'Global'} | Generated: ${new Date().toLocaleString()}`, 14, 28)

    // Table Data
    const tableColumn = ["Rank", "Team Name", "Project Title", "Leader Name", "Judge (/50)", "AI (/50)", "Total (/100)"]
    const tableRows = []

    teams.forEach((team, index) => {
      const teamData = [
        index + 1,
        team.teamName || '-',
        team.projectTitle || '-',
        team.leaderName || '-',
        team.judgeScores?.total ?? 'Pending',
        team.aiScore?.total_ai_score ?? 'Pending',
        team.totalScore || 'Pending'
      ]
      tableRows.push(teamData)
    })

    // Generate Table
    doc.autoTable({
      head: [tableColumn],
      body: tableRows,
      startY: 35,
      theme: 'grid',
      headStyles: { fillColor: [13, 13, 32], textColor: [0, 255, 255] },
      styles: { fontSize: 9, font: 'helvetica' },
      alternateRowStyles: { fillColor: [240, 240, 240] }
    })

    const blob = doc.output('blob')
    window.open(URL.createObjectURL(blob), '_blank')
  }

  const displayTeams = teams
    .filter(t => {
      if (filter === 'scored') return !!(t.totalScore > 0)
      if (filter === 'pending') return !(t.totalScore > 0)
      return true
    })
    .filter(t =>
      !search ||
      t.teamName?.toLowerCase().includes(search.toLowerCase()) ||
      t.projectTitle?.toLowerCase().includes(search.toLowerCase())
    )

  const topThree = teams.filter(t => t.totalScore > 0).slice(0, 3)
  const tableTeams = displayTeams

  const registerLink = eventId ? `/event/${eventId}/register` : '/register'
  const teamLinkBase = eventId ? `/event/${eventId}/team` : '/team'

  return (
    <div className="min-h-screen px-4 py-10 max-w-7xl mx-auto">
      {/* Back to Events */}
      {eventId && (
        <Link to="/" className="inline-flex items-center gap-2 font-mono text-xs text-cyber-muted hover:text-cyber-cyan transition-colors mb-6">
          ← BACK TO EVENTS
        </Link>
      )}

      {/* Header */}
      <div className="text-center mb-10 animate-fade-in-up">
        <div className="flex items-center justify-center gap-3 mb-2">
          <div className="h-px w-16 bg-gradient-to-r from-transparent to-cyber-cyan/50" />
          <span className="cyber-label text-cyber-cyan tracking-widest">LIVE RANKINGS</span>
          <div className="h-px w-16 bg-gradient-to-l from-transparent to-cyber-cyan/50" />
        </div>
        <h1 className="cyber-heading text-4xl neon-text-cyan mb-2 animate-flicker">
          {eventInfo?.eventName || 'DATAVERSE ARENA'}
        </h1>
        <p className="font-mono text-sm text-cyber-muted">
          {eventInfo?.description || 'DataVerse Club · Sapthagiri NPS University, Bengaluru'}
        </p>
        <div className="mt-3 flex items-center justify-center gap-2">
          <div className="w-2 h-2 bg-cyber-green rounded-full animate-neon-pulse" />
          <span className="font-mono text-xs text-cyber-green">LIVE</span>
          {lastUpdated && (
            <span className="font-mono text-[0.6rem] text-cyber-muted">
              · Updated {lastUpdated.toLocaleTimeString()}
            </span>
          )}
        </div>
      </div>

      {/* Top 3 Podium */}
      {!loading && topThree.length > 0 && (
        <div className="mb-10">
          <div className="cyber-label text-center mb-4">TOP PERFORMERS</div>
          <div className={`grid gap-4 ${topThree.length === 1 ? 'max-w-xs mx-auto' : topThree.length === 2 ? 'grid-cols-2 max-w-lg mx-auto' : 'grid-cols-1 sm:grid-cols-3'}`}>
            {topThree.map((team, i) => (
              <TopThreeCard key={team.teamId} team={team} rank={i + 1} index={i} eventId={eventId} />
            ))}
          </div>
        </div>
      )}

      {/* Controls */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <input
          type="text"
          className="cyber-input flex-1"
          placeholder="SEARCH TEAMS..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          id="leaderboard-search"
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
          <button 
            onClick={exportPDF}
            className="btn-cyber text-[0.6rem] px-3 py-2 hover:bg-cyber-magenta hover:text-white hover:border-cyber-magenta transition-colors"
          >
            EXPORT PDF ↓
          </button>
        </div>
      </div>

      <div className="font-mono text-xs text-cyber-muted mb-4">
        {tableTeams.length} TEAMS · AUTO-REFRESHES EVERY {POLL_INTERVAL / 1000}S
      </div>

      {/* Table */}
      {loading ? (
        <LeaderboardSkeleton />
      ) : tableTeams.length === 0 ? (
        <div className="cyber-card p-16 text-center">
          <div className="text-4xl mb-4 neon-text-cyan opacity-30">◈</div>
          <p className="cyber-heading text-sm text-cyber-muted">NO TEAMS YET</p>
          <p className="font-mono text-xs text-cyber-muted mt-2">
            Teams will appear here once registered.
          </p>
          <Link to={registerLink} className="btn-cyber text-xs px-4 py-2 mt-4 inline-block">
            REGISTER YOUR TEAM →
          </Link>
        </div>
      ) : (
        <div className="cyber-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="cyber-table">
              <thead>
                <tr>
                  <th className="w-12">RANK</th>
                  <th>TEAM</th>
                  <th className="hidden md:table-cell">PROJECT</th>
                  <th className="text-right">JUDGE /50</th>
                  <th className="text-right">AI /50</th>
                  <th className="text-right font-bold">TOTAL /100</th>
                  <th className="w-16"></th>
                </tr>
              </thead>
              <tbody>
                {tableTeams.map((team, idx) => {
                  const rank = teams.findIndex(t => t.teamId === team.teamId) + 1
                  const isFlashing = flashIds.has(team.teamId)
                  const hasScore = team.totalScore > 0
                  return (
                    <tr
                      key={team.teamId}
                      className="transition-all duration-300"
                      style={{
                        background: isFlashing ? 'rgba(0,255,255,0.1)' : undefined,
                        boxShadow: isFlashing ? 'inset 0 0 20px rgba(0,255,255,0.15)' : undefined,
                      }}
                    >
                      <td className="w-12">
                        <RankBadge rank={rank} />
                      </td>
                      <td>
                        <div className="cyber-heading text-xs text-cyber-text">{team.teamName}</div>
                        <div className="font-mono text-[0.6rem] text-cyber-muted">{team.leaderName}</div>
                      </td>
                      <td className="hidden md:table-cell">
                        <div className="font-mono text-xs text-cyber-text truncate max-w-[200px]">{team.projectTitle}</div>
                      </td>
                      <td className="text-right">
                        {hasScore && team.judgeScores?.total
                          ? <span className="cyber-heading text-sm text-cyber-magenta">{team.judgeScores.total}</span>
                          : <span className="font-mono text-xs text-cyber-muted">—</span>}
                      </td>
                      <td className="text-right">
                        {hasScore && team.aiScore?.total_ai_score
                          ? <span className="cyber-heading text-sm text-cyber-purple">{team.aiScore.total_ai_score}</span>
                          : <span className="font-mono text-xs text-cyber-muted">—</span>}
                      </td>
                      <td className="text-right">
                        {hasScore
                          ? <span
                              className="cyber-heading text-base text-cyber-cyan"
                              style={{ textShadow: '0 0 6px #00ffff' }}
                            >
                              <CountUp target={team.totalScore} duration={600} />
                            </span>
                          : <span className="font-mono text-xs text-cyber-muted">PENDING</span>}
                      </td>
                      <td>
                        <Link
                          to={`${teamLinkBase}/${team.teamId}`}
                          className="font-mono text-[0.6rem] text-cyber-cyan hover:text-cyber-magenta transition-colors"
                        >
                          →
                        </Link>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Pro Tips for Teams */}
      <div className="mt-10 mb-4">
        <div className="flex items-center gap-3 mb-6 justify-center">
          <div className="h-px w-16 bg-gradient-to-r from-transparent to-cyber-green/50" />
          <span className="cyber-label text-cyber-green tracking-widest">PRO TIPS FOR TEAMS</span>
          <div className="h-px w-16 bg-gradient-to-l from-transparent to-cyber-green/50" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 max-w-5xl mx-auto">
          {[
            {
              icon: '🚀',
              title: 'DEPLOY EARLY',
              tip: 'Get your project live ASAP. A working demo always beats a perfect local setup. Use Netlify, Vercel, or GitHub Pages.',
              color: '#00ffff',
            },
            {
              icon: '🎯',
              title: 'SOLVE THE PROBLEM',
              tip: 'Judges look for how well you understood the problem. Clearly state the issue and how your solution addresses it.',
              color: '#ff0080',
            },
            {
              icon: '✨',
              title: 'POLISH THE UI',
              tip: 'First impressions matter. Add a clean layout, good fonts, and consistent colors. Avoid raw HTML — use CSS frameworks.',
              color: '#9d00ff',
            },
            {
              icon: '📋',
              title: 'SUBMISSION CHECKLIST',
              tip: 'Live URL working? Team info correct? Tech stack listed? Project title clear? Double-check everything before the deadline.',
              color: '#00ff88',
            },
          ].map(t => (
            <div
              key={t.title}
              className="cyber-card p-5 group hover:scale-[1.02] transition-transform duration-300"
              style={{ borderColor: t.color + '40' }}
            >
              <div className="text-2xl mb-2">{t.icon}</div>
              <div className="cyber-heading text-[0.65rem] mb-2" style={{ color: t.color }}>{t.title}</div>
              <p className="font-mono text-[0.7rem] text-cyber-muted leading-relaxed">{t.tip}</p>
            </div>
          ))}
        </div>

        {/* Scoring Breakdown */}
        <div className="max-w-3xl mx-auto mt-6">
          <div className="cyber-card p-5" style={{ borderColor: 'rgba(240,255,0,0.3)' }}>
            <div className="cyber-heading text-[0.65rem] neon-text-yellow mb-3 text-center">HOW SCORING WORKS</div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-center">
              {[
                { label: 'Problem & Idea', score: '/10', color: '#00ffff' },
                { label: 'Functionality', score: '/15', color: '#ff0080' },
                { label: 'UI/UX Design', score: '/8', color: '#f0ff00' },
                { label: 'Innovation', score: '/7', color: '#9d00ff' },
                { label: 'Practical Impact', score: '/5', color: '#00ff88' },
                { label: 'Presentation', score: '/5', color: '#00ffff' },
              ].map(s => (
                <div key={s.label}>
                  <div className="font-mono text-[0.6rem] text-cyber-muted">{s.label}</div>
                  <div className="cyber-heading text-sm" style={{ color: s.color }}>{s.score}</div>
                </div>
              ))}
            </div>
            <div className="text-center mt-3 font-mono text-[0.6rem] text-cyber-muted">
              Judge: 50 pts + AI Analysis: 50 pts = <span className="text-cyber-cyan font-bold">100 pts total</span>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-6 text-center font-mono text-[0.6rem] text-cyber-muted">
        JUDGE SCORE: /50 · AI ANALYSER: /50 · TOTAL: /100 · DATAVERSE ARENA
      </div>
    </div>
  )
}
