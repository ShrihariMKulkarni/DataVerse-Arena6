// netlify/functions/seed.js — One-time data migration from local JSON to Netlify Blobs
// Call POST /.netlify/functions/seed with admin auth to seed existing data
// This can be safely deleted after migration is complete
import { respond, handleOptions, requireAuth } from './_utils/auth.js'
import { initBlobsFromEvent } from './_utils/store.js'
import { connectLambda, getStore } from '@netlify/blobs'

// ── Hardcoded existing data (from local data/ folder) ────────────────────────
const EXISTING_EVENTS = [
  {
    "eventId": "EVT-MOFHJYAP-F9F7",
    "eventName": "Impactus",
    "description": "mini level hackathon with easier problem statements to be solved in 8 hours",
    "createdAt": "2026-04-26T08:07:43.201Z"
  }
]

const EXISTING_TEAMS = [
  {
    "teamId": "HV-MOFHLSBI-BB0787",
    "teamName": "nexus",
    "leaderName": "yahsa",
    "members": [],
    "problemStatement": "smart and clean city",
    "projectTitle": "Ai powered public greveince system",
    "liveUrl": "https://reliable-raindrop-28bf72.netlify.app/",
    "techStack": "",
    "eventId": "EVT-MOFHJYAP-F9F7",
    "registeredAt": "2026-04-26T08:09:08.767Z"
  },
  {
    "teamId": "HV-MOFI0A6U-738158",
    "teamName": "nexusdfd",
    "leaderName": "ldsjfd",
    "members": [],
    "problemStatement": "good for environment",
    "projectTitle": "trashcon",
    "liveUrl": "https://trashcon.in/#",
    "techStack": "",
    "eventId": "EVT-MOFHJYAP-F9F7",
    "registeredAt": "2026-04-26T08:20:25.110Z"
  },
  {
    "teamId": "HV-MOFI42QS-4102CE",
    "teamName": "vibie",
    "leaderName": "shri",
    "members": [],
    "problemStatement": "to help content creators get thigns fast",
    "projectTitle": "ai powered launchpadpro",
    "liveUrl": "https://launchpadpro11.netlify.app/",
    "techStack": "",
    "eventId": "EVT-MOFHJYAP-F9F7",
    "registeredAt": "2026-04-26T08:23:22.084Z"
  }
]

const EXISTING_SCORES = {
  "HV-MOFHLSBI-BB0787": {
    "problemIdea": 7, "functionality": 11, "uiUx": 6, "innovation": 4, "impact": 3, "presentation": 3,
    "total": 34, "scoredBy": "s@gmail.com", "scoredAt": "2026-04-26T15:44:16.298Z"
  },
  "HV-MOFI0A6U-738158": {
    "problemIdea": 7, "functionality": 12, "uiUx": 7, "innovation": 6, "impact": 4, "presentation": 4,
    "total": 40, "scoredBy": "1@gma.com", "scoredAt": "2026-04-26T08:24:11.829Z"
  },
  "HV-MOFI42QS-4102CE": {
    "problemIdea": 4, "functionality": 7, "uiUx": 5, "innovation": 3, "impact": 3, "presentation": 3,
    "total": 25, "scoredBy": "1@gma.com", "scoredAt": "2026-04-26T08:24:23.628Z"
  }
}

const EXISTING_AI_SCORES = {
  "HV-MOFHLSBI-BB0787": {
    "team_name": "nexus", "project_title": "Ai powered public greveince system",
    "detected_stack": "Standard web stack",
    "scores": {
      "functionality": { "score": 8, "reason": "Project is deployed and accessible with substantial content." },
      "ui_ux": { "score": 6, "reason": "Basic visual layout." },
      "innovation": { "score": 8, "reason": "AI/ML integration detected. Real-time features implemented." },
      "impact": { "score": 5, "reason": "Project scope demonstrates practical application potential." },
      "technical_architecture": { "score": 6, "reason": "Data visualization components detected. AI integration adds technical depth." }
    },
    "total_ai_score": 33,
    "verdict": "The project demonstrates solid technical execution using Standard web stack.",
    "top_strengths": ["Successfully deployed and publicly accessible", "AI/ML capabilities integrated", "Data visualization enhances user understanding"],
    "key_improvements": ["Add user authentication", "Include images and visual elements", "Expand the tech stack"],
    "flags": [], "analyzedAt": "2026-04-26T15:46:01.350Z"
  },
  "HV-MOFI0A6U-738158": {
    "team_name": "nexusdfd", "project_title": "trashcon",
    "detected_stack": "Tailwind CSS, Material UI",
    "scores": {
      "functionality": { "score": 10, "reason": "Project is deployed and accessible with substantial content. Interactive forms detected. Authentication flow present." },
      "ui_ux": { "score": 10, "reason": "Rich visual elements with multiple images. Modern CSS framework detected." },
      "innovation": { "score": 5, "reason": "Standard hackathon project approach." },
      "impact": { "score": 8, "reason": "Project addresses a meaningful real-world domain." },
      "technical_architecture": { "score": 8, "reason": "Stack: Tailwind CSS, Material UI. Authentication system implemented." }
    },
    "total_ai_score": 41,
    "verdict": "The project demonstrates strong technical execution using Tailwind CSS, Material UI.",
    "top_strengths": ["Successfully deployed and publicly accessible", "User authentication system", "Rich visual presentation"],
    "key_improvements": [], "flags": [], "analyzedAt": "2026-04-26T15:24:54.241Z"
  },
  "HV-MOFI42QS-4102CE": {
    "team_name": "vibie", "project_title": "ai powered launchpadpro",
    "detected_stack": "Standard web stack",
    "scores": {
      "functionality": { "score": 9, "reason": "Project is deployed and accessible with substantial content. Interactive forms detected." },
      "ui_ux": { "score": 7, "reason": "Basic visual layout. Well-structured content hierarchy." },
      "innovation": { "score": 5, "reason": "Standard hackathon project approach." },
      "impact": { "score": 8, "reason": "Project addresses a meaningful real-world domain." },
      "technical_architecture": { "score": 7, "reason": "Authentication system implemented. Form handling present." }
    },
    "total_ai_score": 36,
    "verdict": "The project demonstrates strong technical execution using Standard web stack.",
    "top_strengths": ["Successfully deployed and publicly accessible", "User authentication system", "Data visualization"],
    "key_improvements": ["Include images and visual elements", "Expand the tech stack"],
    "flags": [], "analyzedAt": "2026-04-26T08:23:31.499Z"
  }
}

const EXISTING_CONFIG = { "registrationOpen": true }

// ── HANDLER ────────────────────────────────────────────────────────────────────
export async function handler(event) {
  initBlobsFromEvent(event)
  connectLambda(event)
  if (event.httpMethod === 'OPTIONS') return handleOptions()
  if (event.httpMethod !== 'POST') return respond(405, { error: 'Method not allowed. Use POST to seed data.' })

  try {
    requireAuth(event)
  } catch (err) {
    return respond(401, { error: err.message })
  }

  try {
    const store = getStore('dataverse')
    const eventId = 'EVT-MOFHJYAP-F9F7'

    // Check if data already exists
    const existingEvents = await store.get('global:events', { type: 'json' })
    if (existingEvents && existingEvents.length > 0) {
      return respond(200, {
        message: 'Data already exists in Blobs. Skipping seed.',
        existingEvents: existingEvents.length,
        skipped: true,
      })
    }

    // Seed all data
    await store.setJSON('global:events', EXISTING_EVENTS)
    await store.setJSON(`event:${eventId}:teams`, EXISTING_TEAMS)
    await store.setJSON(`event:${eventId}:scores`, EXISTING_SCORES)
    await store.setJSON(`event:${eventId}:aiscores`, EXISTING_AI_SCORES)
    await store.setJSON(`event:${eventId}:config`, EXISTING_CONFIG)

    return respond(200, {
      message: 'Data seeded successfully!',
      seeded: {
        events: EXISTING_EVENTS.length,
        teams: EXISTING_TEAMS.length,
        scores: Object.keys(EXISTING_SCORES).length,
        aiScores: Object.keys(EXISTING_AI_SCORES).length,
      }
    })

  } catch (err) {
    console.error('Seed error:', err)
    return respond(500, { error: err.message })
  }
}
