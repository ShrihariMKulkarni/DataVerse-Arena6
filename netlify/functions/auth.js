// netlify/functions/auth.js — POST /auth (login endpoint)
import { respond, handleOptions, signToken } from './_utils/auth.js'
import { getConfig, initBlobsFromEvent } from './_utils/store.js'

export async function handler(event) {
  initBlobsFromEvent(event)
  if (event.httpMethod === 'OPTIONS') return handleOptions()
  if (event.httpMethod !== 'POST') return respond(405, { error: 'Method not allowed' })

  try {
    const { email, password } = JSON.parse(event.body || '{}')
    if (!email || !password) return respond(400, { error: 'Email and password required' })

    const config = await getConfig()

    // Check admin password
    const adminPass = process.env.ADMIN_PASSWORD || config.adminPassword
    if (!adminPass) return respond(500, { error: 'Admin password not configured' })

    if (password !== adminPass) {
      return respond(401, { error: 'ACCESS DENIED: Invalid credentials' })
    }

    // Check if email is in allowed list
    const allowedEmails = config.allowedJudgeEmails || []
    const emailLower = email.toLowerCase()
    if (allowedEmails.length > 0 && !allowedEmails.includes(emailLower)) {
      return respond(403, { error: 'ACCESS DENIED: Email not authorized as judge' })
    }

    const token = signToken({ email: emailLower, role: 'judge' })
    return respond(200, { token, email: emailLower })

  } catch (err) {
    console.error('Auth error:', err)
    return respond(500, { error: err.message || 'Internal server error' })
  }
}
