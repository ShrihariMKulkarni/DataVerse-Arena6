// _utils/store.js — Netlify Blobs-based store with multi-event support
// Replaces the old fs-based store that fails on Netlify's read-only filesystem
import { getStore, connectLambda } from '@netlify/blobs'

// ── LAMBDA CONNECTION ───────────────────────────────────────
// In Netlify Functions v1 (Lambda compat mode), we must call connectLambda()
// with the event object before using getStore(). This sets up the blob context.
let lambdaConnected = false

export function initBlobsFromEvent(lambdaEvent) {
  if (!lambdaConnected) {
    try {
      connectLambda(lambdaEvent)
      lambdaConnected = true
    } catch (err) {
      console.warn('connectLambda failed (may be running locally):', err.message)
    }
  }
}

// ── BLOB STORE HELPERS ──────────────────────────────────────
// We use a single Netlify Blob store called "dataverse" for all data.
// Keys are namespaced: "global:teams", "EVT-xxx:teams", etc.

function getDataStore() {
  if (process.env.NETLIFY_SITE_ID && process.env.NETLIFY_API_TOKEN) {
    return getStore({
      name: 'dataverse',
      siteID: process.env.NETLIFY_SITE_ID,
      token: process.env.NETLIFY_API_TOKEN
    })
  }
  return getStore('dataverse')
}

function keyPrefix(eventId) {
  return eventId ? `event:${eventId}` : 'global'
}

async function readBlob(key, fallback) {
  try {
    const store = getDataStore()
    const data = await store.get(key, { type: 'json' })
    if (data === null || data === undefined) return fallback
    return data
  } catch (err) {
    console.warn(`readBlob(${key}) failed:`, err.message)
    return fallback
  }
}

async function writeBlob(key, data) {
  const store = getDataStore()
  await store.setJSON(key, data)
}

async function deleteBlob(key) {
  try {
    const store = getDataStore()
    await store.delete(key)
  } catch (err) {
    console.warn(`deleteBlob(${key}) failed:`, err.message)
  }
}

// ── KEY GENERATORS ──────────────────────────────────────────
function teamsKey(eventId) {
  return `${keyPrefix(eventId)}:teams`
}
function scoresKey(eventId) {
  return `${keyPrefix(eventId)}:scores`
}
function aiKey(eventId) {
  return `${keyPrefix(eventId)}:aiscores`
}
function configKey(eventId) {
  return `${keyPrefix(eventId)}:config`
}
const EVENTS_KEY = 'global:events'

// ── EVENT OPERATIONS ─────────────────────────────────────
export async function createEvent(event) {
  const events = await readBlob(EVENTS_KEY, [])
  events.push({ ...event, createdAt: new Date().toISOString() })
  await writeBlob(EVENTS_KEY, events)
  // Initialize event config
  await writeBlob(configKey(event.eventId), { registrationOpen: true })
}

export async function getAllEvents() {
  return await readBlob(EVENTS_KEY, [])
}

export async function getEvent(eventId) {
  const events = await readBlob(EVENTS_KEY, [])
  return events.find(e => e.eventId === eventId) || null
}

export async function deleteEvent(eventId) {
  // Remove from events list
  const events = await readBlob(EVENTS_KEY, [])
  const filtered = events.filter(e => e.eventId !== eventId)
  await writeBlob(EVENTS_KEY, filtered)

  // Clean up event data
  await deleteBlob(teamsKey(eventId))
  await deleteBlob(scoresKey(eventId))
  await deleteBlob(aiKey(eventId))
  await deleteBlob(configKey(eventId))
}

// ── TEAM OPERATIONS ──────────────────────────────────────
export async function saveTeam(team, eventId) {
  const key = teamsKey(eventId)
  const teams = await readBlob(key, [])
  teams.push({ ...team, eventId: eventId || null, registeredAt: new Date().toISOString() })
  await writeBlob(key, teams)
}

export async function getAllTeams(eventId) {
  const teams = await readBlob(teamsKey(eventId), [])
  const judgeMap = await readBlob(scoresKey(eventId), {})
  const aiMap = await readBlob(aiKey(eventId), {})

  return teams.map(team => {
    const js = judgeMap[team.teamId] || null
    const ai = aiMap[team.teamId] || null
    return {
      ...team,
      judgeScores: js,
      aiScore: ai,
      totalScore: (js?.total || 0) + (ai?.total_ai_score || 0),
    }
  })
}

export async function getTeamById(teamId, eventId) {
  const teams = await getAllTeams(eventId)
  return teams.find(t => t.teamId === teamId) || null
}

export async function deleteTeam(teamId, eventId) {
  // Remove from teams
  const tKey = teamsKey(eventId)
  const teams = await readBlob(tKey, [])
  const filtered = teams.filter(t => t.teamId !== teamId)
  await writeBlob(tKey, filtered)

  // Remove judge scores
  const sKey = scoresKey(eventId)
  const judgeMap = await readBlob(sKey, {})
  delete judgeMap[teamId]
  await writeBlob(sKey, judgeMap)

  // Remove AI scores
  const aKey = aiKey(eventId)
  const aiMap = await readBlob(aKey, {})
  delete aiMap[teamId]
  await writeBlob(aKey, aiMap)
}

// ── JUDGE SCORES ─────────────────────────────────────────
export async function saveJudgeScores(teamId, scores, scoredBy, eventId) {
  const key = scoresKey(eventId)
  const total = Object.values(scores).reduce((s, v) => s + (typeof v === 'number' ? v : 0), 0)
  const judgeMap = await readBlob(key, {})
  judgeMap[teamId] = { ...scores, total, scoredBy: scoredBy || '', scoredAt: new Date().toISOString() }
  await writeBlob(key, judgeMap)
  return total
}

// ── AI SCORES ────────────────────────────────────────────
export async function saveAIScore(teamId, aiResult, eventId) {
  const key = aiKey(eventId)
  const aiMap = await readBlob(key, {})
  aiMap[teamId] = { ...aiResult, analyzedAt: new Date().toISOString() }
  await writeBlob(key, aiMap)
}

// ── CONFIG ───────────────────────────────────────────────
export async function getConfig(eventId) {
  const cfg = await readBlob(configKey(eventId), {})
  // Handle both boolean false and string "false" from stored config
  const regOpen = cfg.registrationOpen === false || cfg.registrationOpen === 'false' ? false : true
  return {
    registrationOpen: regOpen,
    registrationDeadline: cfg.registrationDeadline || null,
    allowedJudgeEmails: cfg.allowedJudgeEmails || [],
    adminPassword: cfg.adminPassword || process.env.ADMIN_PASSWORD || 'hackverse2026',
  }
}

export async function updateConfig(key, value, eventId) {
  const blobKey = configKey(eventId)
  const cfg = await readBlob(blobKey, {})
  cfg[key] = value
  await writeBlob(blobKey, cfg)
}

// ── MASTER LEADERBOARD (cross-event aggregation) ─────────
export async function getMasterLeaderboard() {
  const events = await readBlob(EVENTS_KEY, [])
  const teamMap = {} // key = lowercase team name

  for (const evt of events) {
    const eid = evt.eventId
    const teams = await readBlob(teamsKey(eid), [])
    const judgeMap = await readBlob(scoresKey(eid), {})
    const aiMap = await readBlob(aiKey(eid), {})

    for (const team of teams) {
      const js = judgeMap[team.teamId] || null
      const ai = aiMap[team.teamId] || null
      const totalScore = (js?.total || 0) + (ai?.total_ai_score || 0)

      const key = team.teamName.trim().toLowerCase()
      if (!teamMap[key]) {
        teamMap[key] = {
          teamName: team.teamName,
          leaderName: team.leaderName || '',
          totalScore: 0,
          events: [],
        }
      }
      teamMap[key].totalScore += totalScore
      teamMap[key].events.push({
        eventId: eid,
        eventName: evt.eventName,
        score: totalScore,
      })
    }
  }

  const leaderboard = Object.values(teamMap)
    .sort((a, b) => b.totalScore - a.totalScore)

  return leaderboard
}

// ── ENSURE HEADERS (no-op for blob store) ────────────────
export async function ensureSheetHeaders() {
  // Nothing needed for blob-based store
}
