// netlify/functions/update-ai.js — POST /update-ai (event-scoped)
import { respond, handleOptions, requireAuth } from './_utils/auth.js'
import { saveAIScore, initBlobsFromEvent, getAllTeams } from './_utils/store.js'

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
    const { teamId, aiScores, eventId } = JSON.parse(event.body || '{}')

    if (!teamId || !aiScores) {
      return respond(400, { error: 'teamId and aiScores are required' })
    }

    const teams = await getAllTeams(eventId)
    const team = teams.find(t => t.teamId === teamId)
    if (!team || !team.aiScore) {
      return respond(404, { error: 'Team or AI score not found' })
    }

    const currentAiScore = team.aiScore
    
    // Update the scores
    const CRITERIA = ['functionality', 'ui_ux', 'innovation', 'impact', 'technical_architecture']
    let total = 0
    CRITERIA.forEach(k => {
      if (currentAiScore.scores[k]) {
        if (aiScores[k] !== undefined) {
          currentAiScore.scores[k].score = Math.min(10, Math.max(0, Math.round(Number(aiScores[k]) || 0)))
        }
        total += currentAiScore.scores[k].score
      }
    })
    
    currentAiScore.total_ai_score = total

    await saveAIScore(teamId, currentAiScore, eventId || null)

    return respond(200, { success: true, aiScore: currentAiScore })

  } catch (err) {
    console.error('Update AI score error:', err)
    return respond(500, { error: err.message })
  }
}
