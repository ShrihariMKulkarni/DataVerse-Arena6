import React, { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useToast } from '../context/ToastContext'
import { api } from '../utils/api'

const DEADLINE = import.meta.env.VITE_REGISTRATION_DEADLINE
  ? new Date(import.meta.env.VITE_REGISTRATION_DEADLINE)
  : null

function useCountdown(deadline) {
  const [timeLeft, setTimeLeft] = useState(null)
  useEffect(() => {
    if (!deadline) return
    const calc = () => {
      const diff = deadline - Date.now()
      if (diff <= 0) { setTimeLeft(null); return }
      const h = Math.floor(diff / 3600000)
      const m = Math.floor((diff % 3600000) / 60000)
      const s = Math.floor((diff % 60000) / 1000)
      setTimeLeft({ h, m, s })
    }
    calc()
    const id = setInterval(calc, 1000)
    return () => clearInterval(id)
  }, [deadline])
  return timeLeft
}

export default function Register() {
  const { eventId } = useParams()
  const { addToast } = useToast()
  const [config, setConfig] = useState(null)
  const [eventInfo, setEventInfo] = useState(null)
  const [form, setForm] = useState({
    teamName: '', leaderName: '',
    member2: '', member3: '', member4: '',
    problemStatement: '', projectTitle: '',
    liveUrl: '', techStack: '',
  })
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(null)
  const timeLeft = useCountdown(DEADLINE)

  useEffect(() => {
    api.getConfig(eventId).then(setConfig).catch(() => {})
    if (eventId) {
      api.getEvent(eventId).then(d => setEventInfo(d.event)).catch(() => {})
    }
  }, [eventId])

  const registrationOpen = config?.registrationOpen !== false
  const isClosed = !registrationOpen

  const handleChange = (field) => (e) => setForm(f => ({ ...f, [field]: e.target.value }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (isClosed) return
    if (!form.liveUrl.startsWith('http')) {
      addToast('LIVE URL must start with http:// or https://', 'error'); return
    }
    setSubmitting(true)
    try {
      const members = [form.member2, form.member3, form.member4].filter(Boolean)
      const res = await api.registerTeam({
        teamName: form.teamName.trim(),
        leaderName: form.leaderName.trim(),
        members,
        problemStatement: form.problemStatement.trim(),
        projectTitle: form.projectTitle.trim(),
        liveUrl: form.liveUrl.trim(),
        techStack: form.techStack.trim(),
        eventId: eventId || null,
      })
      setSubmitted(res)
      addToast('TEAM REGISTERED SUCCESSFULLY', 'success')
    } catch (err) {
      addToast(`REGISTRATION FAILED: ${err.message}`, 'error')
    } finally {
      setSubmitting(false)
    }
  }

  const leaderboardLink = eventId ? `/event/${eventId}/leaderboard` : '/leaderboard'

  // ── Success screen ────────────────────────────────────
  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 py-16">
        <div className="max-w-lg w-full text-center space-y-6 animate-fade-in-up">
          <div className="text-6xl neon-text-green animate-neon-pulse">✓</div>
          <h1 className="cyber-heading text-2xl neon-text-green">REGISTRATION CONFIRMED</h1>
          <div className="cyber-card hud-corners p-6 text-left space-y-3">
            <div>
              <span className="cyber-label">TEAM ID</span>
              <div className="font-mono text-lg neon-text-cyan mt-1">{submitted.teamId}</div>
            </div>
            <div className="cyber-divider" />
            <div>
              <span className="cyber-label">TEAM NAME</span>
              <div className="font-mono text-sm text-cyber-text">{form.teamName}</div>
            </div>
            <div>
              <span className="cyber-label">PROJECT</span>
              <div className="font-mono text-sm text-cyber-text">{form.projectTitle}</div>
            </div>
            <div>
              <span className="cyber-label">LIVE URL</span>
              <a href={form.liveUrl} target="_blank" rel="noopener noreferrer"
                className="font-mono text-sm text-cyber-cyan hover:underline block truncate">
                {form.liveUrl}
              </a>
            </div>
          </div>
          <p className="font-mono text-xs text-cyber-muted">
            Save your Team ID: <span className="text-cyber-cyan">{submitted.teamId}</span>
          </p>
          <div className="flex gap-3 justify-center">
            <Link to={leaderboardLink} className="btn-cyber text-xs px-4 py-2">VIEW LEADERBOARD</Link>
            <button onClick={() => { setSubmitted(null); setForm({ teamName:'',leaderName:'',member2:'',member3:'',member4:'',problemStatement:'',projectTitle:'',liveUrl:'',techStack:'' }) }}
              className="btn-cyber btn-cyber-magenta text-xs px-4 py-2">
              REGISTER ANOTHER
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ── Registration form ─────────────────────────────────
  return (
    <div className="min-h-screen px-4 py-12">
      <div className="max-w-2xl mx-auto">
        {/* Back to Events */}
        {eventId && (
          <Link to={leaderboardLink} className="inline-flex items-center gap-2 font-mono text-xs text-cyber-muted hover:text-cyber-cyan transition-colors mb-6">
            ← BACK TO LEADERBOARD
          </Link>
        )}

        {/* Header */}
        <div className="mb-10">
          <div className="flex items-center gap-3 mb-2">
            <div className="h-px flex-1 bg-gradient-to-r from-transparent to-cyber-cyan/30" />
            <span className="cyber-label text-cyber-cyan">{eventInfo?.eventName || 'DATAVERSE ARENA'}</span>
            <div className="h-px flex-1 bg-gradient-to-l from-transparent to-cyber-cyan/30" />
          </div>
          <h1 className="cyber-heading text-3xl neon-text-cyan mb-2">TEAM REGISTRATION</h1>
          <p className="font-mono text-sm text-cyber-muted">
            Register your team for evaluation · DataVerse Club · Sapthagiri NPS University
          </p>

          {/* Countdown / deadline */}
          {timeLeft && (
            <div className="mt-4 flex items-center gap-4">
              <span className="cyber-label">DEADLINE IN</span>
              {[
                { v: timeLeft.h, l: 'HRS' },
                { v: timeLeft.m, l: 'MIN' },
                { v: timeLeft.s, l: 'SEC' },
              ].map(({ v, l }) => (
                <div key={l} className="text-center">
                  <div className="cyber-heading text-2xl neon-text-magenta w-12 text-center"
                    style={{ textShadow: '0 0 10px #ff0080' }}>
                    {String(v).padStart(2, '0')}
                  </div>
                  <div className="cyber-label">{l}</div>
                </div>
              ))}
            </div>
          )}

          {isClosed && (
            <div className="mt-4 cyber-card p-4 border-[#ff3333]/40 bg-[#ff3333]/5">
              <p className="font-mono text-sm text-[#ff3333] flex items-center gap-2">
                <span>⚠</span> REGISTRATION IS CURRENTLY CLOSED
              </p>
            </div>
          )}
        </div>

        {/* Form */}
        <form
          id="registration-form"
          onSubmit={handleSubmit}
          className="cyber-card hud-corners p-8 space-y-6"
        >
          {/* Team Info */}
          <section>
            <h2 className="cyber-heading text-sm neon-text-cyan mb-4">
              ◈ TEAM INFORMATION
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="cyber-label" htmlFor="teamName">TEAM NAME *</label>
                <input id="teamName" className="cyber-input" placeholder="Team Nexus"
                  value={form.teamName} onChange={handleChange('teamName')}
                  required disabled={isClosed} maxLength={50} />
              </div>
              <div>
                <label className="cyber-label" htmlFor="leaderName">TEAM LEADER *</label>
                <input id="leaderName" className="cyber-input" placeholder="Full name"
                  value={form.leaderName} onChange={handleChange('leaderName')}
                  required disabled={isClosed} maxLength={50} />
              </div>
            </div>
          </section>

          {/* Members */}
          <section>
            <h2 className="cyber-heading text-sm neon-text-magenta mb-4">◈ TEAM MEMBERS (up to 3 more)</h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {[
                { field: 'member2', label: 'MEMBER 2', id: 'member2' },
                { field: 'member3', label: 'MEMBER 3', id: 'member3' },
                { field: 'member4', label: 'MEMBER 4', id: 'member4' },
              ].map(({ field, label, id }) => (
                <div key={field}>
                  <label className="cyber-label" htmlFor={id}>{label}</label>
                  <input id={id} className="cyber-input" placeholder="Optional"
                    value={form[field]} onChange={handleChange(field)}
                    disabled={isClosed} maxLength={50} />
                </div>
              ))}
            </div>
          </section>

          {/* Project */}
          <section>
            <h2 className="cyber-heading text-sm neon-text-yellow mb-4">◈ PROJECT DETAILS</h2>
            <div className="space-y-4">
              <div>
                <label className="cyber-label" htmlFor="projectTitle">PROJECT TITLE *</label>
                <input id="projectTitle" className="cyber-input" placeholder="AI-powered attendance system..."
                  value={form.projectTitle} onChange={handleChange('projectTitle')}
                  required disabled={isClosed} maxLength={100} />
              </div>
              <div>
                <label className="cyber-label" htmlFor="problemStatement">PROBLEM STATEMENT *</label>
                <textarea id="problemStatement" className="cyber-input min-h-[90px] resize-y"
                  placeholder="Describe the real-world problem your project solves..."
                  value={form.problemStatement} onChange={handleChange('problemStatement')}
                  required disabled={isClosed} maxLength={500} />
              </div>
              <div>
                <label className="cyber-label" htmlFor="liveUrl">LIVE URL *</label>
                <input id="liveUrl" type="url" className="cyber-input"
                  placeholder="https://your-project.vercel.app"
                  value={form.liveUrl} onChange={handleChange('liveUrl')}
                  required disabled={isClosed} />
                <p className="font-mono text-[0.6rem] text-cyber-muted mt-1">
                  Vercel, Netlify, Railway, Render — any live URL works
                </p>
              </div>
              <div>
                <label className="cyber-label" htmlFor="techStack">TECH STACK (optional)</label>
                <input id="techStack" className="cyber-input"
                  placeholder="React, Node.js, MongoDB, Python (Flask)..."
                  value={form.techStack} onChange={handleChange('techStack')}
                  disabled={isClosed} maxLength={200} />
              </div>
            </div>
          </section>

          <div className="cyber-divider" />

          <button
            type="submit"
            id="register-submit"
            disabled={submitting || isClosed}
            className="btn-cyber btn-cyber-solid w-full py-3 text-sm"
          >
            {submitting ? '[ REGISTERING... ]' : isClosed ? '[ REGISTRATION CLOSED ]' : '[ SUBMIT REGISTRATION ]'}
          </button>

          <p className="font-mono text-[0.6rem] text-cyber-muted text-center">
            By registering you agree to participate under DataVerse Club rules.
          </p>
        </form>
      </div>
    </div>
  )
}
