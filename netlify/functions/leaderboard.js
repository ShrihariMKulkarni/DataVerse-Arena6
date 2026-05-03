// netlify/functions/leaderboard.js — GET /leaderboard (public, event-scoped)
import { respond, handleOptions } from './_utils/auth.js'
import { getAllTeams, initBlobsFromEvent } from './_utils/store.js'

export async function handler(event) {
  initBlobsFromEvent(event)
  if (event.httpMethod === 'OPTIONS') return handleOptions()
  if (event.httpMethod !== 'GET') return respond(405, { error: 'Method not allowed' })

  const eventId = event.queryStringParameters?.eventId || null

  try {
    const teams = await getAllTeams(eventId)

    // Sort: scored teams by totalScore desc, then unscored alphabetically
    const scored = teams
      .filter(t => t.totalScore > 0)
      .sort((a, b) => b.totalScore - a.totalScore)

    const unscored = teams
      .filter(t => t.totalScore === 0)
      .sort((a, b) => a.teamName.localeCompare(b.teamName))

    const ranked = [...scored, ...unscored]

    return respond(200, { teams: ranked, total: ranked.length })

  } catch (err) {
    console.error('Leaderboard error:', err)
    return respond(500, { error: err.message })
  }
}
