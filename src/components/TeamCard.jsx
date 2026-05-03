import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { useToast } from '../context/ToastContext'
import { api } from '../utils/api'
import ScorePanel from './ScorePanel'
import AIScoreDisplay from './AIScoreDisplay'

function StatusBadge({ team }) {
  const hasAI = !!team.aiScore?.total_ai_score
  const hasJudge = !!team.judgeScores?.total
  if (hasAI && hasJudge) return <span className="cyber-badge text-cyber-green border-cyber-green text-[0.55rem]">◉ FULLY SCORED</span>
  if (hasAI || hasJudge) return <span className="cyber-badge text-cyber-yellow border-cyber-yellow text-[0.55rem]">◈ PARTIAL</span>
  return <span className="cyber-badge text-cyber-muted border-cyber-muted text-[0.55rem]">○ PENDING</span>
}

export default function TeamCard({ team, judgeEmail, onUpdated, eventId }) {
  const { addToast } = useToast()
  const [expanded, setExpanded] = useState(false)
  const [analyzing, setAnalyzing] = useState(false)
  const [showAI, setShowAI] = useState(false)
  const [localAI, setLocalAI] = useState(team.aiScore || null)
  const [localJudge, setLocalJudge] = useState(team.judgeScores || null)
  const [deleting, setDeleting] = useState(false)

  const totalScore = (localJudge?.total || 0) + (localAI?.total_ai_score || 0)

  const handleAnalyze = async () => {
    setAnalyzing(true)
    try {
      addToast(`INITIATING AI SCAN: ${team.teamName}`, 'info')
      const result = await api.analyzeTeam({
        teamId: team.teamId,
        teamName: team.teamName,
        projectTitle: team.projectTitle,
        url: team.liveUrl,
        techStack: team.techStack || '',
        problemStatement: team.problemStatement || '',
        eventId: eventId || null,
      })
      setLocalAI(result)
      setShowAI(true)
      addToast('AI ANALYSIS COMPLETE', 'success')
      onUpdated?.()
    } catch (err) {
      addToast(`AI SCAN FAILED: ${err.message}`, 'error')
    } finally {
      setAnalyzing(false)
    }
  }

  const handleDelete = async () => {
    if (!window.confirm(`Are you sure you want to permanently delete team "${team.teamName}"? This will remove all scores and data.`)) return
    setDeleting(true)
    try {
      await api.deleteTeam(team.teamId, eventId)
      addToast(`TEAM DELETED: ${team.teamName}`, 'success')
      onUpdated?.()
    } catch (err) {
      addToast(`DELETE FAILED: ${err.message}`, 'error')
      setDeleting(false)
    }
  }

  const teamDetailLink = eventId ? `/event/${eventId}/team/${team.teamId}` : `/team/${team.teamId}`

  return (
    <div className={`cyber-card p-5 transition-all duration-300 animate-fade-in-up ${expanded ? 'border-cyber-cyan/40' : ''}`}>
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <h3
              className="cyber-heading text-base text-cyber-cyan truncate"
              style={{ textShadow: '0 0 6px #00ffff' }}
            >
              {team.teamName}
            </h3>
            <StatusBadge team={{ ...team, aiScore: localAI, judgeScores: localJudge }} />
          </div>
          <p className="font-mono text-xs text-cyber-text truncate-2">{team.projectTitle}</p>
          <p className="font-mono text-[0.65rem] text-cyber-muted mt-1">
            Leader: {team.leaderName}
          </p>
        </div>
        {/* Total Score */}
        <div className="flex-shrink-0 text-right">
          <div className="cyber-label">TOTAL</div>
          <div
            className="cyber-heading text-xl"
            style={{
              color: totalScore > 0 ? '#00ffff' : '#6b7fa3',
              textShadow: totalScore > 0 ? '0 0 8px #00ffff' : 'none',
            }}
          >
            {totalScore > 0 ? totalScore : '—'}
            {totalScore > 0 && <span className="text-cyber-muted text-xs">/100</span>}
          </div>
        </div>
      </div>

      {/* URL */}
      {team.liveUrl && (
        <a
          href={team.liveUrl.startsWith('http') ? team.liveUrl : `https://${team.liveUrl}`}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="flex items-center gap-1.5 font-mono text-xs text-cyber-cyan hover:text-cyber-magenta transition-colors mb-3 group w-fit"
        >
          <span className="group-hover:neon-text-magenta">⬡</span>
          <span className="truncate underline underline-offset-2">{team.liveUrl}</span>
          <span className="opacity-50">↗</span>
        </a>
      )}

      {/* Scores summary */}
      <div className="grid grid-cols-3 gap-2 mb-4">
        {[
          { label: 'JUDGE', value: localJudge?.total, max: 50, color: '#ff0080' },
          { label: 'AI', value: localAI?.total_ai_score, max: 50, color: '#9d00ff' },
          { label: 'TOTAL', value: totalScore || null, max: 100, color: '#00ffff' },
        ].map(s => (
          <div key={s.label} className="cyber-card p-2 text-center border-0 bg-black/20">
            <div className="cyber-label text-[0.55rem]">{s.label}</div>
            <div
              className="cyber-heading text-sm"
              style={{ color: s.value ? s.color : '#6b7fa3', textShadow: s.value ? `0 0 6px ${s.color}` : 'none' }}
            >
              {s.value ?? '—'}
            </div>
          </div>
        ))}
      </div>

      {/* Action buttons */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setExpanded(v => !v)}
          className="btn-cyber text-[0.65rem] px-3 py-1.5 flex-1"
        >
          {expanded ? '[ COLLAPSE ]' : '[ SCORE TEAM ]'}
        </button>
        <button
          onClick={handleAnalyze}
          disabled={analyzing}
          className="btn-cyber btn-cyber-purple text-[0.65rem] px-3 py-1.5 flex-1"
        >
          {analyzing ? '[ SCANNING... ]' : localAI ? '[ RE-ANALYZE ]' : '[ RUN AI SCAN ]'}
        </button>
        <Link
          to={teamDetailLink}
          className="btn-cyber btn-cyber-magenta text-[0.65rem] px-3 py-1.5 text-center"
        >
          [ VIEW ]
        </Link>
        <button
          onClick={handleDelete}
          disabled={deleting}
          className="btn-cyber text-[0.65rem] px-3 py-1.5"
          style={{ borderColor: '#ff3333', color: '#ff3333' }}
          title="Delete this team"
        >
          {deleting ? '...' : '[ ✕ ]'}
        </button>
      </div>

      {/* Expanded: Score panel + AI results */}
      {expanded && (
        <div className="mt-5 pt-5 border-t border-cyber-cyan/15 space-y-6">
          <ScorePanel
            team={team}
            judgeEmail={judgeEmail}
            onScored={(s) => {
              setLocalJudge({ ...s })
              onUpdated?.()
            }}
            eventId={eventId}
          />

          {(localAI || showAI) && (
            <div className="pt-4 border-t border-cyber-purple/15">
              <AIScoreDisplay aiScore={localAI} animate={showAI} teamId={team.teamId} eventId={eventId} onUpdated={(newScore) => {
                setLocalAI(newScore)
                onUpdated?.()
              }} />
            </div>
          )}
        </div>
      )}
    </div>
  )
}
