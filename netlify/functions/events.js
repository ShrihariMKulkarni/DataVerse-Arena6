// netlify/functions/events.js — GET/POST/DELETE /events
import { randomBytes } from 'crypto'
import { respond, handleOptions, requireAuth } from './_utils/auth.js'
import { createEvent, getAllEvents, getEvent, deleteEvent, getMasterLeaderboard, initBlobsFromEvent } from './_utils/store.js'

function genEventId() {
  return `EVT-${Date.now().toString(36).toUpperCase()}-${randomBytes(2).toString('hex').toUpperCase()}`
}

export async function handler(event) {
  initBlobsFromEvent(event)
  if (event.httpMethod === 'OPTIONS') return handleOptions()

  // GET: list all events, get single event, or master leaderboard
  if (event.httpMethod === 'GET') {
    try {
      // Master leaderboard — aggregate scores across all events
      if (event.queryStringParameters?.master === 'true') {
        const leaderboard = await getMasterLeaderboard()
        return respond(200, { leaderboard })
      }

      const eventId = event.queryStringParameters?.eventId
      if (eventId) {
        const evt = await getEvent(eventId)
        if (!evt) return respond(404, { error: 'Event not found' })
        return respond(200, { event: evt })
      }
      const events = await getAllEvents()
      return respond(200, { events })
    } catch (err) {
      return respond(500, { error: err.message })
    }
  }

  // POST: create new event (auth required)
  if (event.httpMethod === 'POST') {
    try {
      requireAuth(event)
    } catch (err) {
      return respond(401, { error: err.message })
    }

    try {
      const body = JSON.parse(event.body || '{}')
      const { eventName, description } = body
      if (!eventName) return respond(400, { error: 'eventName is required' })

      const eventId = genEventId()
      await createEvent({
        eventId,
        eventName: eventName.trim(),
        description: (description || '').trim(),
      })

      return respond(201, { eventId, eventName: eventName.trim(), message: 'Event created successfully' })
    } catch (err) {
      console.error('Create event error:', err)
      return respond(500, { error: err.message })
    }
  }

  // DELETE: delete event (auth required)
  if (event.httpMethod === 'DELETE') {
    try {
      requireAuth(event)
    } catch (err) {
      return respond(401, { error: err.message })
    }

    try {
      const eventId = event.queryStringParameters?.eventId
      if (!eventId) return respond(400, { error: 'eventId is required' })
      await deleteEvent(eventId)
      return respond(200, { success: true, message: 'Event deleted' })
    } catch (err) {
      console.error('Delete event error:', err)
      return respond(500, { error: err.message })
    }
  }

  return respond(405, { error: 'Method not allowed' })
}
