// netlify/functions/teams.js — GET/POST/DELETE /teams (event-scoped)
import { randomBytes } from 'crypto'
import { respond, handleOptions, requireAuth } from './_utils/auth.js'
import { saveTeam, getAllTeams, getTeamById, getConfig, deleteTeam, ensureSheetHeaders, initBlobsFromEvent } from './_utils/store.js'

function genTeamId() {
  const rand = randomBytes(3).toString('hex').toUpperCase()
  return `HV-${Date.now().toString(36).toUpperCase()}-${rand}`
}

export async function handler(event) {
  initBlobsFromEvent(event)
  if (event.httpMethod === 'OPTIONS') return handleOptions()

  const eventId = event.queryStringParameters?.eventId || null

  // GET: fetch single or all teams
  if (event.httpMethod === 'GET') {
    const teamId = event.queryStringParameters?.teamId

    if (teamId) {
      // Single team — public
      try {
        const team = await getTeamById(teamId, eventId)
        if (!team) return respond(404, { error: 'Team not found' })
        return respond(200, { team })
      } catch (err) {
        return respond(500, { error: err.message })
      }
    }

    // All teams — requires auth
    try {
      requireAuth(event)
      const teams = await getAllTeams(eventId)
      return respond(200, { teams })
    } catch (err) {
      if (err.message.startsWith('UNAUTHORIZED')) return respond(401, { error: err.message })
      return respond(500, { error: err.message })
    }
  }

  // POST: register a new team — public
  if (event.httpMethod === 'POST') {
    try {
      const body = JSON.parse(event.body || '{}')
      const { teamName, leaderName, projectTitle, liveUrl, problemStatement } = body
      const bodyEventId = body.eventId || eventId

      if (!teamName || !leaderName || !projectTitle || !liveUrl || !problemStatement) {
        return respond(400, { error: 'Missing required fields: teamName, leaderName, projectTitle, liveUrl, problemStatement' })
      }

      // Check registration is open
      const config = await getConfig(bodyEventId)
      if (config.registrationOpen === false) {
        return respond(403, { error: 'REGISTRATION IS CLOSED' })
      }
      if (config.registrationDeadline && new Date() > new Date(config.registrationDeadline)) {
        return respond(403, { error: 'REGISTRATION DEADLINE HAS PASSED' })
      }

      // Ensure headers exist
      await ensureSheetHeaders()

      const teamId = genTeamId()

      await saveTeam({
        teamId,
        teamName: teamName.trim(),
        leaderName: leaderName.trim(),
        members: Array.isArray(body.members) ? body.members.filter(Boolean) : [],
        problemStatement: problemStatement.trim(),
        projectTitle: projectTitle.trim(),
        liveUrl: liveUrl.trim(),
        techStack: body.techStack?.trim() || '',
      }, bodyEventId)

      return respond(201, { teamId, message: 'Team registered successfully' })

    } catch (err) {
      console.error('Register error:', err)
      return respond(500, { error: err.message })
    }
  }

  // DELETE: delete a team (auth required)
  if (event.httpMethod === 'DELETE') {
    try {
      requireAuth(event)
    } catch (err) {
      return respond(401, { error: err.message })
    }

    try {
      const teamId = event.queryStringParameters?.teamId
      if (!teamId) return respond(400, { error: 'teamId is required' })
      await deleteTeam(teamId, eventId)
      return respond(200, { success: true, message: 'Team deleted successfully' })
    } catch (err) {
      console.error('Delete team error:', err)
      return respond(500, { error: err.message })
    }
  }

  return respond(405, { error: 'Method not allowed' })
}
