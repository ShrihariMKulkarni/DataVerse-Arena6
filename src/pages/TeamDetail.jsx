import React, { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { api } from '../utils/api'
import AIScoreDisplay from '../components/AIScoreDisplay'
import { TeamDetailSkeleton } from '../components/LoadingSkeleton'

const JUDGE_CRITERIA_META = [
  { key: 'problemIdea', label: 'Problem Understanding & Idea', max: 10 },
  { key: 'functionality', label: 'Functionality', max: 15 },
  { key: 'uiUx', label: 'UI / UX Design', max: 8 },
  { key: 'innovation', label: 'Innovation / Creativity', max: 7 },
  { key: 'impact', label: 'Practical Impact', max: 5 },
  { key: 'presentation', label: 'Presentation & Explanation', max: 5 },
]

function AnimatedBar({ value, max, color = '#00ffff', delay = 0 }) {
  const [width, setWidth] = useState(0)
  useEffect(() => {
    const t = setTimeout(() => setWidth((value / max) * 100), delay + 200)
    return () => clearTimeout(t)
  }, [value, max, delay])
  return (
    <div className="cyber-progress-track">
      <div
        className="cyber-progress-fill"
        style={{
          width: `${width}%`,
          background: `linear-gradient(90deg, ${color}, #9d00ff)`,
          boxShadow: `0 0 8px ${color}`,
          transition: 'width 1.2s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
      />
    </div>
  )
}

export default function TeamDetail() {
  const { teamId, eventId } = useParams()
  const [team, setTeam] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    api.getTeam(teamId, eventId)
      .then(data => setTeam(data.team))
      .catch(err => setError(err.message))
      .finally(() => setLoading(false))
  }, [teamId, eventId])

  if (loading) return <div className="px-4 py-10"><TeamDetailSkeleton /></div>

  const leaderboardLink = eventId ? `/event/${eventId}/leaderboard` : '/leaderboard'

  if (error || !team) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="text-center space-y-4">
          <div className="text-5xl neon-text-magenta">⚠</div>
          <h1 className="cyber-heading text-xl text-cyber-magenta">TEAM NOT FOUND</h1>
          <p className="font-mono text-xs text-cyber-muted">{error || 'No data for this team ID.'}</p>
          <Link to={leaderboardLink} className="btn-cyber text-xs px-4 py-2 inline-block">
            ← BACK TO LEADERBOARD
          </Link>
        </div>
      </div>
    )
  }

  const { judgeScores, aiScore, members = [] } = team
  const totalScore = (judgeScores?.total || 0) + (aiScore?.total_ai_score || 0)

  return (
    <div className="min-h-screen px-4 py-10 max-w-5xl mx-auto">
      {/* Back */}
      <Link to={leaderboardLink} className="inline-flex items-center gap-2 font-mono text-xs text-cyber-muted hover:text-cyber-cyan transition-colors mb-8">
        ← BACK TO LEADERBOARD
      </Link>

      {/* Hero Section */}
      <div className="cyber-card hud-corners p-8 mb-8 relative overflow-hidden animate-fade-in-up">
        {/* BG glow */}
        <div
          className="absolute top-0 right-0 w-64 h-64 opacity-5"
          style={{ background: 'radial-gradient(circle, #00ffff, transparent)', filter: 'blur(40px)' }}
        />

        <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <span className="cyber-badge text-cyber-cyan border-cyber-cyan text-[0.55rem]">TEAM ID: {teamId}</span>
              {totalScore > 0 && (
                <span className="cyber-badge text-cyber-green border-cyber-green text-[0.55rem]">◉ SCORED</span>
              )}
            </div>
            <h1
              className="cyber-heading text-3xl neon-text-cyan mb-2"
              style={{ textShadow: '0 0 12px #00ffff' }}
            >
              {team.teamName}
            </h1>
            <p className="font-mono text-sm text-cyber-text mb-1">{team.projectTitle}</p>
            <p className="font-mono text-xs text-cyber-muted mb-4">{team.problemStatement}</p>

            {/* Members */}
            <div className="flex flex-wrap gap-2 mb-4">
              {[team.leaderName, ...members].filter(Boolean).map((m, i) => (
                <span key={i} className="cyber-badge text-cyber-text border-cyber-border text-[0.6rem]">
                  {i === 0 ? '⭐ ' : ''}{m}
                </span>
              ))}
            </div>

            {/* Live URL */}
            {team.liveUrl && (
              <a
                href={team.liveUrl.startsWith('http') ? team.liveUrl : `https://${team.liveUrl}`}
                target="_blank"
                rel="noopener noreferrer"
                id={`team-url-${teamId}`}
                className="inline-flex items-center gap-2 btn-cyber text-xs px-4 py-2"
              >
                ⬡ VISIT LIVE PROJECT ↗
              </a>
            )}
          </div>

          {/* Total Score */}
          <div className="flex-shrink-0 text-center">
            <div className="cyber-label mb-1">COMBINED SCORE</div>
            <div
              className="cyber-heading text-6xl"
              style={{
                color: totalScore > 75 ? '#00ff88' : totalScore > 50 ? '#00ffff' : '#ff0080',
                textShadow: `0 0 20px currentColor, 0 0 40px currentColor`,
              }}
            >
              {totalScore}
            </div>
            <div className="font-mono text-sm text-cyber-muted mt-1">OUT OF 100</div>
            <div className="flex gap-3 mt-3 justify-center text-center">
              <div>
                <div className="cyber-label text-[0.55rem]">JUDGE</div>
                <div className="cyber-heading text-lg text-cyber-magenta">{judgeScores?.total ?? '—'}/50</div>
              </div>
              <div className="w-px bg-cyber-cyan/20" />
              <div>
                <div className="cyber-label text-[0.55rem]">AI ANALYSER</div>
                <div className="cyber-heading text-lg text-cyber-purple">{aiScore?.total_ai_score ?? '—'}/50</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Judge Scores */}
        <div className="cyber-card p-6 animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
          <div className="flex items-center justify-between mb-5">
            <h2 className="cyber-heading text-sm neon-text-magenta">JUDGE EVALUATION</h2>
            <div className="cyber-heading text-xl text-cyber-magenta">
              {judgeScores?.total ?? '—'}<span className="text-cyber-muted text-xs">/50</span>
            </div>
          </div>

          {judgeScores ? (
            <div className="space-y-4">
              {JUDGE_CRITERIA_META.map((c, i) => (
                <div key={c.key}>
                  <div className="flex justify-between items-center mb-1">
                    <span className="font-mono text-xs text-cyber-text">{c.label}</span>
                    <span className="cyber-heading text-sm text-cyber-magenta">
                      {judgeScores[c.key] ?? 0}/{c.max}
                    </span>
                  </div>
                  <AnimatedBar
                    value={judgeScores[c.key] ?? 0}
                    max={c.max}
                    color="#ff0080"
                    delay={i * 100}
                  />
                </div>
              ))}
              {judgeScores.scoredBy && (
                <p className="font-mono text-[0.6rem] text-cyber-muted pt-2 border-t border-cyber-cyan/10">
                  Scored by: {judgeScores.scoredBy}
                </p>
              )}
            </div>
          ) : (
            <div className="text-center py-8">
              <div className="text-3xl text-cyber-muted opacity-40 mb-2">◈</div>
              <p className="font-mono text-xs text-cyber-muted">JUDGE SCORES PENDING</p>
            </div>
          )}
        </div>

        {/* Tech Stack & Info */}
        <div className="space-y-4">
          {team.techStack && (
            <div className="cyber-card p-5 animate-fade-in-up" style={{ animationDelay: '0.15s' }}>
              <div className="cyber-label mb-2">DECLARED TECH STACK</div>
              <p className="font-mono text-sm text-cyber-text">{team.techStack}</p>
            </div>
          )}
          {aiScore?.detected_stack && (
            <div className="cyber-card p-5 border-cyber-purple/30 animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
              <div className="cyber-label mb-2">AI-DETECTED STACK</div>
              <p className="font-mono text-sm text-cyber-purple" style={{ textShadow: '0 0 4px #9d00ff' }}>
                {aiScore.detected_stack}
              </p>
            </div>
          )}
          <div className="cyber-card p-5 animate-fade-in-up" style={{ animationDelay: '0.25s' }}>
            <div className="cyber-label mb-2">REGISTRATION</div>
            <p className="font-mono text-xs text-cyber-muted">
              {team.registeredAt ? new Date(team.registeredAt).toLocaleString() : 'Unknown'}
            </p>
          </div>
        </div>
      </div>

      {/* AI Breakdown */}
      {aiScore ? (
        <div className="mt-6 cyber-card p-6 animate-fade-in-up" style={{ animationDelay: '0.3s' }}>
          <AIScoreDisplay aiScore={aiScore} animate teamId={teamId} eventId={eventId} onUpdated={(newScore) => setTeam(prev => ({ ...prev, aiScore: newScore }))} />
        </div>
      ) : (
        <div className="mt-6 cyber-card p-10 text-center border-cyber-purple/20 animate-fade-in-up">
          <div className="text-4xl neon-text-purple opacity-40 mb-3">◈</div>
          <p className="cyber-heading text-sm text-cyber-muted">AI ANALYSIS PENDING</p>
          <p className="font-mono text-xs text-cyber-muted mt-2">
            A judge must trigger AI analysis from the Judge Dashboard.
          </p>
        </div>
      )}
    </div>
  )
}
