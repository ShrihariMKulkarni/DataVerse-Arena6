import React, { useEffect, useRef, useState } from 'react'
import { api } from '../utils/api'
import { useToast } from '../context/ToastContext'

function CountUp({ target, duration = 1200 }) {
  const [current, setCurrent] = useState(0)
  const frameRef = useRef(null)
  useEffect(() => {
    const start = Date.now()
    const step = () => {
      const elapsed = Date.now() - start
      const progress = Math.min(elapsed / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      setCurrent(Math.round(eased * target))
      if (progress < 1) frameRef.current = requestAnimationFrame(step)
    }
    frameRef.current = requestAnimationFrame(step)
    return () => cancelAnimationFrame(frameRef.current)
  }, [target, duration])
  return <>{current}</>
}

function NeonProgressBar({ value, max = 10, color = 'cyan', delay = 0 }) {
  const [width, setWidth] = useState(0)
  useEffect(() => {
    const t = setTimeout(() => setWidth((value / max) * 100), delay + 100)
    return () => clearTimeout(t)
  }, [value, max, delay])
  const colorMap = {
    cyan: 'linear-gradient(90deg, #00ffff, #9d00ff)',
    magenta: 'linear-gradient(90deg, #ff0080, #9d00ff)',
    green: 'linear-gradient(90deg, #00ff88, #00ffff)',
    yellow: 'linear-gradient(90deg, #f0ff00, #00ffff)',
  }
  const shadowMap = {
    cyan: '0 0 8px #00ffff',
    magenta: '0 0 8px #ff0080',
    green: '0 0 8px #00ff88',
    yellow: '0 0 8px #f0ff00',
  }
  return (
    <div className="cyber-progress-track">
      <div
        className="cyber-progress-fill relative"
        style={{
          width: `${width}%`,
          background: colorMap[color] || colorMap.cyan,
          boxShadow: shadowMap[color] || shadowMap.cyan,
          transition: 'width 1.2s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
      />
    </div>
  )
}

const CRITERIA_META = {
  functionality: { label: 'LIVE FUNCTIONALITY', icon: '⚡', color: 'cyan' },
  ui_ux: { label: 'UI / UX POLISH', icon: '◈', color: 'magenta' },
  innovation: { label: 'INNOVATION', icon: '◆', color: 'yellow' },
  impact: { label: 'REAL-WORLD IMPACT', icon: '◉', color: 'green' },
  technical_architecture: { label: 'TECH ARCHITECTURE', icon: '⟁', color: 'cyan' },
}

export default function AIScoreDisplay({ aiScore, animate = true, teamId, eventId, onUpdated }) {
  const { addToast } = useToast()
  const [isEditing, setIsEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [editableScores, setEditableScores] = useState({})
  
  useEffect(() => {
    if (aiScore?.scores && isEditing) {
      const init = {}
      Object.keys(CRITERIA_META).forEach(k => {
        init[k] = aiScore.scores[k]?.score || 0
      })
      setEditableScores(init)
    }
  }, [isEditing, aiScore])

  if (!aiScore) return null
  const { scores, total_ai_score, detected_stack, verdict, top_strengths, key_improvements } = aiScore

  const handleSave = async () => {
    setSaving(true)
    try {
      const res = await api.updateAiScores({ teamId, eventId: eventId || null, aiScores: editableScores })
      addToast('AI SCORES UPDATED', 'success')
      setIsEditing(false)
      onUpdated?.(res.aiScore)
    } catch (err) {
      addToast(`UPDATE FAILED: ${err.message}`, 'error')
    } finally {
      setSaving(false)
    }
  }

  const currentTotal = isEditing 
    ? Object.values(editableScores).reduce((a, b) => a + (Number(b) || 0), 0)
    : total_ai_score

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <div className="cyber-label mb-1">AI EVALUATION RESULT</div>
          <div className="flex items-center gap-3">
            <h3 className="cyber-heading text-lg neon-text-cyan">AI SCORE BREAKDOWN</h3>
            {teamId && (
              isEditing ? (
                <div className="flex gap-2">
                  <button onClick={handleSave} disabled={saving} className="btn-cyber btn-cyber-magenta text-[0.55rem] px-2 py-1">
                    {saving ? 'SAVING...' : 'SAVE'}
                  </button>
                  <button onClick={() => setIsEditing(false)} disabled={saving} className="btn-cyber text-[0.55rem] px-2 py-1">
                    CANCEL
                  </button>
                </div>
              ) : (
                <button onClick={() => setIsEditing(true)} className="btn-cyber text-[0.55rem] px-2 py-1">
                  EDIT SCORES
                </button>
              )
            )}
          </div>
        </div>
        <div className="text-center">
          <div className="cyber-label">TOTAL AI SCORE</div>
          <div
            className="cyber-heading text-4xl neon-text-cyan"
            style={{ textShadow: '0 0 20px #00ffff, 0 0 40px rgba(0,255,255,0.3)' }}
          >
            {animate && !isEditing ? <CountUp target={currentTotal} duration={1500} /> : currentTotal}
            <span className="text-cyber-muted text-xl">/50</span>
          </div>
        </div>
      </div>

      {/* Detected Stack */}
      {detected_stack && (
        <div className="cyber-card p-3 border-cyber-purple/30">
          <span className="cyber-label">DETECTED STACK</span>
          <span className="font-mono text-sm text-cyber-purple" style={{ textShadow: '0 0 6px #9d00ff' }}>
            {detected_stack}
          </span>
        </div>
      )}

      {/* Score Criteria */}
      <div className="space-y-4">
        {scores && Object.entries(CRITERIA_META).map(([key, meta], idx) => {
          const item = scores[key]
          if (!item && !isEditing) return null
          const currentVal = isEditing ? editableScores[key] || 0 : item?.score || 0
          return (
            <div key={key} className="cyber-card p-4 hud-corners" style={{ animationDelay: `${idx * 0.1}s` }}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className={`neon-text-${meta.color} text-lg`}>{meta.icon}</span>
                  <span className="cyber-heading text-xs tracking-wider text-cyber-text">{meta.label}</span>
                </div>
                <div className={`cyber-heading text-xl neon-text-${meta.color}`}>
                  {animate && !isEditing ? <CountUp target={currentVal} duration={1000 + idx * 200} /> : currentVal}
                  <span className="text-cyber-muted text-sm">/10</span>
                </div>
              </div>
              {isEditing ? (
                <div className="mt-3">
                  <div className="relative">
                    <div className="cyber-progress-track mb-1">
                      <div
                        className="cyber-progress-fill"
                        style={{
                          width: `${(currentVal / 10) * 100}%`,
                          background: `linear-gradient(90deg, var(--cyber-${meta.color}), #9d00ff)`,
                          boxShadow: `0 0 8px var(--cyber-${meta.color})`,
                          transition: 'width 0.2s ease',
                        }}
                      />
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="10"
                      value={currentVal}
                      onChange={(e) => setEditableScores(prev => ({ ...prev, [key]: Number(e.target.value) }))}
                      className="w-full"
                    />
                  </div>
                </div>
              ) : (
                <NeonProgressBar value={currentVal} max={10} color={meta.color} delay={idx * 150} />
              )}
              {item?.reason && !isEditing && (
                <p className="font-mono text-xs text-cyber-muted mt-2 leading-relaxed">{item.reason}</p>
              )}
            </div>
          )
        })}
      </div>

      {/* Verdict */}
      {verdict && (
        <div className="cyber-card p-5 border-cyber-cyan/30">
          <div className="cyber-label mb-2">AI VERDICT</div>
          <p className="font-mono text-sm text-cyber-text leading-relaxed">{verdict}</p>
        </div>
      )}

    </div>
  )
}
