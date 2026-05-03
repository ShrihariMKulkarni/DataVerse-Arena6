// netlify/functions/scores.js — POST /scores (event-scoped)
import { respond, handleOptions, requireAuth } from './_utils/auth.js'
import { saveJudgeScores, initBlobsFromEvent } from './_utils/store.js'

export async function handler(event) {
  initBlobsFromEvent(event)
  if (event.httpMethod === 'OPTIONS') return handleOptions()
  if (event.httpMethod !== 'POST') return respond(405, { error: 'Method not allowed' })

  try {
    requireAuth(event)
  } catch (err) {
    return respond(401, { error: err.message })
  }

  try {
    const { teamId, scores, scoredBy, eventId } = JSON.parse(event.body || '{}')

    if (!teamId || !scores) {
      return respond(400, { error: 'teamId and scores are required' })
    }

    // Validate score ranges
    const LIMITS = {
      problemIdea: 10,
      functionality: 15,
      uiUx: 8,
      innovation: 7,
      impact: 5,
      presentation: 5,
    }

    const validated = {}
    Object.entries(LIMITS).forEach(([k, max]) => {
      validated[k] = Math.min(max, Math.max(0, Math.round(scores[k] || 0)))
    })

    const total = await saveJudgeScores(teamId, validated, scoredBy, eventId || null)

    return respond(200, { success: true, total, scores: validated })

  } catch (err) {
    console.error('Scores error:', err)
    return respond(500, { error: err.message })
  }
}
