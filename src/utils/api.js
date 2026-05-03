const BASE = import.meta.env.VITE_API_BASE || '/.netlify/functions'

function getToken() {
  return localStorage.getItem('haj_token')
}

async function request(path, options = {}) {
  const token = getToken()
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers || {}),
  }
  const res = await fetch(`${BASE}${path}`, { ...options, headers })
  const data = await res.json().catch(() => ({ error: 'Invalid JSON response' }))
  
  if (res.status === 401) {
    localStorage.removeItem('haj_token')
    localStorage.removeItem('haj_user')
    window.location.href = '/' // force redirect to login/home
    throw new Error('Session expired. Please log in again.')
  }
  
  if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`)
  return data
}

function eventQuery(eventId) {
  return eventId ? `eventId=${eventId}` : ''
}

function appendQuery(path, eventId) {
  const eq = eventQuery(eventId)
  if (!eq) return path
  return path.includes('?') ? `${path}&${eq}` : `${path}?${eq}`
}

export const api = {
  // Auth
  login: (email, password) =>
    request('/auth', { method: 'POST', body: JSON.stringify({ email, password }) }),

  // Events
  getEvents: () => request('/events', { method: 'GET' }),
  getEvent: (eventId) => request(`/events?eventId=${eventId}`, { method: 'GET' }),
  createEvent: (payload) =>
    request('/events', { method: 'POST', body: JSON.stringify(payload) }),
  deleteEvent: (eventId) =>
    request(`/events?eventId=${eventId}`, { method: 'DELETE' }),

  // Teams (event-scoped)
  registerTeam: (payload) =>
    request('/teams', { method: 'POST', body: JSON.stringify(payload) }),

  getTeams: (eventId) => request(appendQuery('/teams', eventId), { method: 'GET' }),

  getTeam: (teamId, eventId) =>
    request(appendQuery(`/teams?teamId=${teamId}`, eventId), { method: 'GET' }),

  deleteTeam: (teamId, eventId) =>
    request(appendQuery(`/teams?teamId=${teamId}`, eventId), { method: 'DELETE' }),

  // AI Analysis (event-scoped via body)
  analyzeTeam: (payload) =>
    request('/analyze', { method: 'POST', body: JSON.stringify(payload) }),

  // Judge Scores (event-scoped via body)
  saveScores: (payload) =>
    request('/scores', { method: 'POST', body: JSON.stringify(payload) }),

  updateAiScores: (payload) =>
    request('/update-ai', { method: 'POST', body: JSON.stringify(payload) }),

  // Leaderboard (event-scoped)
  getLeaderboard: (eventId) =>
    request(appendQuery('/leaderboard', eventId), { method: 'GET' }),

  // Config (event-scoped)
  getConfig: (eventId) =>
    request(appendQuery('/config', eventId), { method: 'GET' }),
  updateConfig: (payload) =>
    request('/config', { method: 'POST', body: JSON.stringify(payload) }),

  // Master Leaderboard (cross-event)
  getMasterLeaderboard: () =>
    request('/events?master=true', { method: 'GET' }),
}
