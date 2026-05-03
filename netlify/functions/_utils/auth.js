import jwt from 'jsonwebtoken'

const JWT_SECRET = process.env.JWT_SECRET || 'hackverse-2026-secret-change-this'

export function signToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '12h' })
}

export function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET)
  } catch {
    return null
  }
}

export function getTokenFromEvent(event) {
  const auth = event.headers?.authorization || event.headers?.Authorization || ''
  if (auth.startsWith('Bearer ')) return auth.slice(7)
  return null
}

export function requireAuth(event) {
  const token = getTokenFromEvent(event)
  if (!token) throw new Error('UNAUTHORIZED: No token provided')
  const payload = verifyToken(token)
  if (!payload) throw new Error('UNAUTHORIZED: Invalid or expired token')
  return payload
}

export function corsHeaders(origin = '*') {
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  }
}

export function respond(statusCode, body, extra = {}) {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json',
      ...corsHeaders(),
      ...extra,
    },
    body: JSON.stringify(body),
  }
}

export function handleOptions() {
  return { statusCode: 204, headers: corsHeaders(), body: '' }
}
