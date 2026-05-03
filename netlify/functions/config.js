// netlify/functions/config.js — GET/POST /config (event-scoped)
import { respond, handleOptions, requireAuth } from './_utils/auth.js'
import { getConfig, updateConfig, initBlobsFromEvent } from './_utils/store.js'

export async function handler(event) {
  initBlobsFromEvent(event)
  if (event.httpMethod === 'OPTIONS') return handleOptions()

  const eventId = event.queryStringParameters?.eventId || null

  // GET — public
  if (event.httpMethod === 'GET') {
    try {
      const config = await getConfig(eventId)
      // Don't leak admin password
      const { adminPassword, ...safeConfig } = config
      return respond(200, safeConfig)
    } catch (err) {
      return respond(500, { error: err.message })
    }
  }

  // POST — admin only
  if (event.httpMethod === 'POST') {
    try {
      requireAuth(event)
    } catch (err) {
      return respond(401, { error: err.message })
    }

    try {
      const body = JSON.parse(event.body || '{}')
      const bodyEventId = body.eventId || eventId
      const updates = []

      if (typeof body.registrationOpen === 'boolean')
        updates.push(updateConfig('registrationOpen', body.registrationOpen, bodyEventId))
      if (body.registrationDeadline)
        updates.push(updateConfig('registrationDeadline', body.registrationDeadline, bodyEventId))
      if (body.hackathonDate)
        updates.push(updateConfig('hackathonDate', body.hackathonDate, bodyEventId))
      if (Array.isArray(body.allowedJudgeEmails))
        updates.push(updateConfig('allowedJudgeEmails', body.allowedJudgeEmails.join(','), bodyEventId))

      await Promise.all(updates)

      const updatedConfig = await getConfig(bodyEventId)
      const { adminPassword, ...safeConfig } = updatedConfig
      return respond(200, { success: true, config: safeConfig })

    } catch (err) {
      console.error('Config update error:', err)
      return respond(500, { error: err.message })
    }
  }

  return respond(405, { error: 'Method not allowed' })
}
