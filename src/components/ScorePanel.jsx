import React, { useState } from 'react'
import { useToast } from '../context/ToastContext'
import { api } from '../utils/api'

const JUDGE_CRITERIA = [
  { key: 'problemIdea', label: 'Problem Understanding & Idea', max: 10, color: 'cyan' },
  { key: 'functionality', label: 'Functionality', max: 15, color: 'magenta' },
  { key: 'uiUx', label: 'UI / UX Design', max: 8, color: 'yellow' },
  { key: 'innovation', label: 'Innovation / Creativity', max: 7, color: 'purple' },
  { key: 'impact', label: 'Practical Impact', max: 5, color: 'green' },
  { key: 'presentation', label: 'Presentation & Explanation', max: 5, color: 'cyan' },
]

const colorMap = {
  cyan: { text: '#00ffff', shadow: '0 0 6px #00ffff' },
  magenta: { text: '#ff0080', shadow: '0 0 6px #ff0080' },
  yellow: { text: '#f0ff00', shadow: '0 0 6px #f0ff00' },
  purple: { text: '#9d00ff', shadow: '0 0 6px #9d00ff' },
  green: { text: '#00ff88', shadow: '0 0 6px #00ff88' },
}

export default function ScorePanel({ team, judgeEmail, onScored, eventId }) {
  const { addToast } = useToast()
  const [scores, setScores] = useState(() => {
    const init = {}
    JUDGE_CRITERIA.forEach(c => {
      init[c.key] = team?.judgeScores?.[c.key] ?? 0
    })
    return init
  })
  const [saving, setSaving] = useState(false)

  const total = JUDGE_CRITERIA.reduce((sum, c) => sum + (scores[c.key] || 0), 0)

  const handleSave = async () => {
    setSaving(true)
    try {
      await api.saveScores({
        teamId: team.teamId,
        scores,
        scoredBy: judgeEmail,
        eventId: eventId || null,
      })
      addToast('SCORES SAVED TO DATASHEET', 'success')
      onScored?.({ ...scores, total })
    } catch (err) {
      addToast(`SAVE FAILED: ${err.message}`, 'error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="cyber-heading text-sm neon-text-magenta">JUDGE SCORE PANEL</h4>
        <div className="text-right">
          <div className="cyber-label">TOTAL</div>
          <div
            className="cyber-heading text-2xl"
            style={{ color: total > 40 ? '#00ff88' : total > 25 ? '#f0ff00' : '#ff0080', textShadow: `0 0 10px currentColor` }}
          >
            {total}<span className="text-cyber-muted text-sm">/50</span>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        {JUDGE_CRITERIA.map(criterion => {
          const c = colorMap[criterion.color] || colorMap.cyan
          const pct = ((scores[criterion.key] || 0) / criterion.max) * 100
          return (
            <div key={criterion.key} className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="font-mono text-xs text-cyber-text">{criterion.label}</label>
                <span
                  className="cyber-heading text-sm"
                  style={{ color: c.text, textShadow: c.shadow }}
                >
                  {scores[criterion.key]}<span className="text-cyber-muted text-xs">/{criterion.max}</span>
                </span>
              </div>
              <div className="relative">
                {/* Progress visual behind slider */}
                <div className="cyber-progress-track mb-1">
                  <div
                    className="cyber-progress-fill"
                    style={{
                      width: `${pct}%`,
                      background: `linear-gradient(90deg, ${c.text}, #9d00ff)`,
                      boxShadow: c.shadow,
                      transition: 'width 0.2s ease',
                    }}
                  />
                </div>
                <input
                  type="range"
                  min={0}
                  max={criterion.max}
                  value={scores[criterion.key] || 0}
                  onChange={e => setScores(prev => ({ ...prev, [criterion.key]: Number(e.target.value) }))}
                  className="w-full"
                  id={`slider-${team.teamId}-${criterion.key}`}
                />
              </div>
            </div>
          )
        })}
      </div>

      <button
        onClick={handleSave}
        disabled={saving}
        className="btn-cyber btn-cyber-magenta w-full mt-2"
      >
        {saving ? '[ SAVING... ]' : '[ SAVE JUDGE SCORES ]'}
      </button>
    </div>
  )
}
