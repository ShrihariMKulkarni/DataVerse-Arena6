// netlify/functions/analyze.js — POST /analyze
// Uses Google Gemini (free) + built-in URL scraping to assess live projects
import { GoogleGenerativeAI } from '@google/generative-ai'
import { respond, handleOptions, requireAuth } from './_utils/auth.js'
import { saveAIScore, initBlobsFromEvent } from './_utils/store.js'

// ── WEB SCRAPER ───────────────────────────────────────────────────────────────
async function scrapePage(url) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 18000)

  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
      },
      redirect: 'follow',
    })
    clearTimeout(timer)

    const html = await res.text()
    const statusCode = res.status

    // ── Extract page metadata ──────────────────────────────
    const title = (html.match(/<title[^>]*>([^<]{0,200})<\/title>/i)?.[1] || '').trim()

    const metaDesc = (
      html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']{0,300})["']/i)?.[1] ||
      html.match(/<meta[^>]*content=["']([^"']{0,300})["'][^>]*name=["']description["']/i)?.[1] ||
      ''
    ).trim()

    // ── Extract headings ────────────────────────────────────
    const h1s = [...html.matchAll(/<h1[^>]*>([^<]{0,150})<\/h1>/gi)]
      .map(m => m[1].trim()).filter(Boolean).slice(0, 5).join(' | ')

    const h2s = [...html.matchAll(/<h2[^>]*>([^<]{0,150})<\/h2>/gi)]
      .map(m => m[1].trim()).filter(Boolean).slice(0, 8).join(' | ')

    // ── Detect tech stack from source ───────────────────────
    const scripts = [...html.matchAll(/src=["']([^"']+)["']/gi)].map(m => m[1])
    const linkHrefs = [...html.matchAll(/href=["']([^"']+)["']/gi)].map(m => m[1])
    const detectedStack = detectTechStack(html, scripts, linkHrefs, res.headers)

    // ── Extract nav links (to understand app structure) ─────
    const navLinks = [...html.matchAll(/<a[^>]*href=["']([^"'#]{1,100})["'][^>]*>([^<]{0,50})<\/a>/gi)]
      .map(m => m[2].trim()).filter(Boolean).slice(0, 15).join(', ')

    // ── Extract visible text ─────────────────────────────────
    const bodyText = html
      .replace(/<script[\s\S]*?<\/script>/gi, '')
      .replace(/<style[\s\S]*?<\/style>/gi, '')
      .replace(/<svg[\s\S]*?<\/svg>/gi, '')
      .replace(/<!--[\s\S]*?-->/g, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&[a-z]+;/gi, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 3000)

    // ── Check for <img> tags (UI effort) ────────────────────
    const imgCount = (html.match(/<img/gi) || []).length
    const hasCanvas = html.includes('<canvas')
    const hasChart = html.toLowerCase().includes('chart') || html.toLowerCase().includes('graph')
    const hasAuth = html.toLowerCase().includes('login') || html.toLowerCase().includes('signup') || html.toLowerCase().includes('register')
    const hasForm = (html.match(/<form/gi) || []).length

    return {
      url,
      statusCode,
      accessible: statusCode >= 200 && statusCode < 400,
      title,
      metaDesc,
      headings: { h1s, h2s },
      navLinks,
      detectedStack,
      bodyText,
      imgCount,
      hasCanvas,
      hasChart,
      hasAuth,
      formCount: hasForm,
      htmlLength: html.length,
    }
  } catch (err) {
    clearTimeout(timer)
    const isTimeout = err.name === 'AbortError'
    return {
      url,
      statusCode: 0,
      accessible: false,
      error: isTimeout ? 'Page timed out (18s)' : err.message,
      title: '', metaDesc: '', headings: {}, navLinks: '',
      detectedStack: '', bodyText: '', imgCount: 0,
    }
  }
}

function detectTechStack(html, scripts, links, headers) {
  const hints = new Set()

  // Frameworks from script tags / html identifiers
  if (html.includes('__NEXT_DATA__') || scripts.some(s => s.includes('/_next/'))) hints.add('Next.js')
  if (html.includes('__nuxt') || scripts.some(s => s.includes('_nuxt'))) hints.add('Nuxt.js')
  if (html.includes('ng-version') || html.includes('ng-app') || scripts.some(s => s.includes('angular'))) hints.add('Angular')
  if (html.includes('data-reactroot') || html.includes('__reactFiber') || scripts.some(s => s.includes('react'))) hints.add('React')
  if (html.includes('__vue') || html.includes('data-v-') || scripts.some(s => s.includes('vue'))) hints.add('Vue.js')
  if (scripts.some(s => s.includes('svelte'))) hints.add('Svelte')
  if (scripts.some(s => s.includes('vite') || s.includes('@vite'))) hints.add('Vite')
  if (html.includes('data-astro') || scripts.some(s => s.includes('astro'))) hints.add('Astro')

  // CSS frameworks
  if (links.some(l => l.includes('tailwind')) || html.includes('tailwindcss') || html.match(/class="[^"]*\b(px-|py-|flex|grid|text-|bg-|border-)\w/)) hints.add('Tailwind CSS')
  if (links.some(l => l.includes('bootstrap')) || html.includes('bootstrap')) hints.add('Bootstrap')
  if (links.some(l => l.includes('material')) || html.includes('MuiButton') || html.includes('material-ui')) hints.add('Material UI')

  // Backend indicators
  if (html.includes('/api/') || html.includes('express')) hints.add('Express/Node.js API')
  if (scripts.some(s => s.includes('firebase'))) hints.add('Firebase')
  if (scripts.some(s => s.includes('supabase'))) hints.add('Supabase')
  if (html.includes('Django') || html.toLowerCase().includes('csrftoken')) hints.add('Django')
  if (html.includes('Laravel') || html.includes('laravel')) hints.add('Laravel')
  if (html.includes('flask') || html.includes('Werkzeug')) hints.add('Flask')

  // AI / ML
  if (html.toLowerCase().includes('openai') || html.includes('gpt')) hints.add('OpenAI')
  if (html.toLowerCase().includes('gemini') || html.toLowerCase().includes('google ai')) hints.add('Google AI')
  if (html.toLowerCase().includes('hugging face') || html.includes('transformers')) hints.add('Hugging Face')

  return hints.size > 0 ? [...hints].join(', ') : 'Standard web stack'
}

// ── SMART HEURISTIC FALLBACK ──────────────────────────────────────────────────
function buildHeuristicResult(pageData, teamName, projectTitle, declaredStack, problemStatement) {
  const isAlive = pageData.accessible
  const stack = pageData.detectedStack || declaredStack || 'Standard web stack'
  const stackParts = stack.split(',').map(s => s.trim()).filter(Boolean)
  const hasMultipleFrameworks = stackParts.length >= 3
  const hasImages = pageData.imgCount > 3
  const hasNavigation = pageData.navLinks && pageData.navLinks.length > 10
  const hasAuth = pageData.hasAuth
  const hasForms = pageData.formCount > 0
  const hasChart = pageData.hasChart
  const hasCanvas = pageData.hasCanvas
  const htmlSize = pageData.htmlLength || 0
  const title = pageData.title || projectTitle || ''
  const bodyText = pageData.bodyText || ''
  const headings = [pageData.headings?.h1s, pageData.headings?.h2s].filter(Boolean).join(' ')

  // ── FUNCTIONALITY (0–10)
  let funcScore = 0
  let funcReason = ''
  if (!isAlive) {
    funcScore = 1
    funcReason = 'The live URL could not be reached. The project may not be deployed correctly.'
  } else {
    funcScore = 5 // Base: site is up
    if (htmlSize > 5000) funcScore += 1
    if (htmlSize > 20000) funcScore += 1
    if (hasForms) funcScore += 1
    if (hasAuth) funcScore += 1
    if (hasNavigation) funcScore += 1
    funcScore = Math.min(10, funcScore)
    funcReason = `Project is deployed and accessible with ${htmlSize > 20000 ? 'substantial' : 'moderate'} content.${hasForms ? ' Interactive forms detected.' : ''}${hasAuth ? ' Authentication flow present.' : ''}`
  }

  // ── UI/UX (0–10)
  let uiScore = isAlive ? 4 : 2
  let uiReason = ''
  if (isAlive) {
    if (hasImages) uiScore += 2
    if (headings.length > 10) uiScore += 1
    if (hasChart || hasCanvas) uiScore += 1
    if (stackParts.some(s => /tailwind|bootstrap|material|chakra/i.test(s))) uiScore += 1
    if (htmlSize > 15000) uiScore += 1
    uiScore = Math.min(10, uiScore)
    uiReason = `${hasImages ? 'Rich visual elements with multiple images.' : 'Basic visual layout.'}${stackParts.some(s => /tailwind|bootstrap|material/i.test(s)) ? ' Modern CSS framework detected.' : ''} ${headings.length > 10 ? 'Well-structured content hierarchy.' : ''}`
  } else {
    uiReason = 'Cannot evaluate UI as the project is inaccessible.'
  }

  // ── INNOVATION (0–10)
  let innovScore = 5
  let innovReason = ''
  const lowerBody = bodyText.toLowerCase()
  const lowerProblem = (problemStatement || '').toLowerCase()
  const hasAI = /\b(ai|machine learning|ml|neural|nlp|gpt|gemini|llm|deep learning)\b/i.test(lowerBody + ' ' + lowerProblem + ' ' + stack)
  const hasBlockchain = /\b(blockchain|web3|crypto|nft|smart contract|solidity)\b/i.test(lowerBody + ' ' + lowerProblem)
  const hasIoT = /\b(iot|internet of things|sensor|arduino|raspberry)\b/i.test(lowerBody + ' ' + lowerProblem)
  const hasRealtime = /\b(realtime|real-time|websocket|socket\.io|live|streaming)\b/i.test(lowerBody + ' ' + lowerProblem)

  if (hasAI) { innovScore += 2; innovReason += 'AI/ML integration detected. ' }
  if (hasBlockchain) { innovScore += 2; innovReason += 'Blockchain/Web3 elements present. ' }
  if (hasIoT) { innovScore += 2; innovReason += 'IoT integration identified. ' }
  if (hasRealtime) { innovScore += 1; innovReason += 'Real-time features implemented. ' }
  if (!innovReason) innovReason = 'Standard hackathon project approach. '
  innovReason += `Built around "${title || projectTitle || 'this project'}".`
  innovScore = Math.min(10, innovScore)

  // ── IMPACT (0–10)
  let impactScore = 5
  let impactReason = ''
  const impactKeywords = /\b(health|education|environment|safety|accessibility|finance|agriculture|disaster|emergency|social|community|sustainability)\b/i
  if (impactKeywords.test(lowerBody + ' ' + lowerProblem)) {
    impactScore += 2
    impactReason = 'Project addresses a meaningful real-world domain. '
  }
  if (problemStatement && problemStatement.length > 50) {
    impactScore += 1
    impactReason += 'Well-articulated problem statement. '
  }
  if (hasAuth && hasForms) {
    impactScore += 1
    impactReason += 'User-facing application with interactive functionality. '
  }
  if (!impactReason) impactReason = 'Project scope demonstrates practical application potential.'
  impactScore = Math.min(10, impactScore)

  // ── TECHNICAL ARCHITECTURE (0–10)
  let techScore = 4
  let techReason = ''
  if (hasMultipleFrameworks) { techScore += 2; techReason += `Multi-layer stack: ${stack}. ` }
  else if (stackParts.length >= 1 && stackParts[0] !== 'Standard web stack') { techScore += 1; techReason += `Stack: ${stack}. ` }
  if (hasAuth) { techScore += 1; techReason += 'Authentication system implemented. ' }
  if (hasForms) { techScore += 1; techReason += 'Form handling present. ' }
  if (hasChart || hasCanvas) { techScore += 1; techReason += 'Data visualization components detected. ' }
  if (hasAI) { techScore += 1; techReason += 'AI integration adds technical depth. ' }
  if (!techReason) techReason = `Tech stack: ${stack}.`
  techScore = Math.min(10, techScore)

  // ── STRENGTHS & IMPROVEMENTS (team-specific)
  const strengths = []
  const improvements = []

  if (isAlive) strengths.push('Successfully deployed and publicly accessible')
  else improvements.push('Ensure the project URL is live and accessible before evaluation')

  if (hasMultipleFrameworks) strengths.push(`Diverse tech stack spanning ${stackParts.length} technologies`)
  if (hasAuth) strengths.push('User authentication system implemented')
  if (hasAI) strengths.push('AI/ML capabilities integrated into the project')
  if (hasImages) strengths.push('Rich visual presentation with multimedia elements')
  if (hasChart || hasCanvas) strengths.push('Data visualization enhances user understanding')
  if (hasForms) strengths.push('Interactive user input capabilities')
  if (hasRealtime) strengths.push('Real-time features improve user engagement')
  if (htmlSize > 20000) strengths.push('Substantial codebase demonstrating effort and complexity')

  if (!hasAuth && isAlive) improvements.push('Add user authentication to enhance functionality')
  if (!hasImages && isAlive) improvements.push('Include images and visual elements to improve UI polish')
  if (stackParts.length < 2) improvements.push('Consider expanding the tech stack for greater technical depth')
  if (!hasChart && !hasCanvas && isAlive) improvements.push('Add data visualization to make the app more engaging')
  if (htmlSize < 5000 && isAlive) improvements.push('Expand content and features to demonstrate more depth')
  if (!hasForms && isAlive) improvements.push('Add interactive forms for user engagement')

  // Keep top 3 each
  const topStrengths = strengths.slice(0, 3)
  const topImprovements = improvements.slice(0, 3)

  // ── VERDICT
  const verdict = isAlive
    ? `The project "${projectTitle || title}" demonstrates ${techScore >= 7 ? 'strong' : techScore >= 5 ? 'solid' : 'foundational'} technical execution using ${stack}. ${funcScore >= 7 ? 'The application is fully functional and well-deployed.' : 'The core features are operational.'} ${innovScore >= 7 ? 'The approach shows notable innovation.' : 'The concept follows standard hackathon patterns with room for creative differentiation.'}`
    : `The project "${projectTitle}" could not be accessed at the provided URL. The team should verify their deployment is live and publicly accessible.`

  return {
    team_name: teamName || 'Unknown',
    project_title: projectTitle || 'Unknown',
    detected_stack: stack,
    scores: {
      functionality: { score: funcScore, reason: funcReason.trim() },
      ui_ux: { score: uiScore, reason: uiReason.trim() },
      innovation: { score: innovScore, reason: innovReason.trim() },
      impact: { score: impactScore, reason: impactReason.trim() },
      technical_architecture: { score: techScore, reason: techReason.trim() },
    },
    total_ai_score: funcScore + uiScore + innovScore + impactScore + techScore,
    verdict,
    top_strengths: topStrengths,
    key_improvements: topImprovements,
    flags: !isAlive ? ['Project URL is not accessible'] : [],
  }
}

// ── EVALUATION PROMPT ─────────────────────────────────────────────────────────
function buildPrompt(pageData, teamName, projectTitle, declaredStack) {
  return `You are an AI project evaluator for Hackverse, a university hackathon by the DataVerse Club at Sapthagiri NPS University, Bengaluru. Teams of 2–4 students built full-stack projects in 8 hours. Evaluate the project below and return a JSON score.

PROJECT INFO:
- Team Name: ${teamName || 'Unknown'}
- Project Title: ${projectTitle || 'Unknown'}
- Live URL: ${pageData.url}
- Declared Tech Stack: ${declaredStack || 'Not specified'}

SCRAPED LIVE PAGE DATA:
- HTTP Status: ${pageData.statusCode} (${pageData.accessible ? 'ACCESSIBLE' : 'NOT ACCESSIBLE'})
- Page Title: ${pageData.title || 'None'}
- Meta Description: ${pageData.metaDesc || 'None'}
- H1 Headings: ${pageData.headings?.h1s || 'None found'}
- H2 Headings: ${pageData.headings?.h2s || 'None found'}
- Navigation Links: ${pageData.navLinks || 'None found'}
- Auto-Detected Stack: ${pageData.detectedStack || 'Could not detect'}
- Images found: ${pageData.imgCount || 0}
- Has auth pages: ${pageData.hasAuth ? 'Yes' : 'No'}
- Has forms: ${pageData.formCount ? 'Yes (' + pageData.formCount + ' form(s))' : 'No'}
- Has data visualization: ${pageData.hasChart ? 'Yes' : 'No'}
- HTML content length: ${pageData.htmlLength || 0} chars
${pageData.error ? `- ERROR: ${pageData.error}` : ''}

VISIBLE PAGE TEXT (first 3000 chars):
${pageData.bodyText || 'Could not extract text'}

SCORING RUBRIC — 50 POINTS TOTAL (10 each):

① LIVE FUNCTIONALITY & COMPLETENESS (0–10)
Is the app deployed and accessible? Do core features appear to work? Any obvious issues?
10 = Fully working | 7–9 = Mostly works | 4–6 = Core works, some broken | 1–3 = Barely functional | 0 = Inaccessible

② UI/UX & VISUAL POLISH (0–10)
Based on page structure, headings, images, layout hints. Is it clean and well-organized?
10 = Professional | 7–9 = Clean with minor issues | 4–6 = Functional but rough | 1–3 = Messy | 0 = No UI effort

③ INNOVATION & UNIQUENESS (0–10)
Is the idea original? Does it do something impressive for an 8-hour build?
10 = Genuinely creative | 7–9 = Good twist | 4–6 = Standard | 1–3 = Generic | 0 = No originality

④ REAL-WORLD IMPACT & RELEVANCE (0–10)
Does it solve a real, meaningful problem? Clear target users?
10 = Clear value | 7–9 = Useful | 4–6 = Surface-level | 1–3 = Vague | 0 = No application

⑤ TECHNICAL ARCHITECTURE & DEPTH (0–10)
Based on detected stack, form/auth presence, API usage. Evidence of technical depth?
10 = Impressive depth | 7–9 = Good stack | 4–6 = Basic | 1–3 = Shallow | 0 = No merit

CRITICAL: This is an 8-HOUR student build. Be generous but fair. A working simple project beats a broken complex one.

If the page is inaccessible or errored, give functionality score 0-2 but still score the other criteria based on what the project description suggests.

RESPOND ONLY IN THIS EXACT JSON FORMAT. No markdown, no preamble, no explanation outside the JSON:
{
  "team_name": "${teamName || 'Unknown'}",
  "project_title": "${projectTitle || 'Unknown'}",
  "detected_stack": "string",
  "scores": {
    "functionality": { "score": 0, "reason": "string (1-2 sentences)" },
    "ui_ux": { "score": 0, "reason": "string (1-2 sentences)" },
    "innovation": { "score": 0, "reason": "string (1-2 sentences)" },
    "impact": { "score": 0, "reason": "string (1-2 sentences)" },
    "technical_architecture": { "score": 0, "reason": "string (1-2 sentences)" }
  },
  "total_ai_score": 0,
  "verdict": "string (3-4 sentences summarizing the project)",
  "top_strengths": ["string", "string"],
  "key_improvements": ["string", "string"],
  "flags": ["string"]
}`
}

// ── HANDLER ───────────────────────────────────────────────────────────────────
export async function handler(event) {
  initBlobsFromEvent(event)
  if (event.httpMethod === 'OPTIONS') return handleOptions()
  if (event.httpMethod !== 'POST') return respond(405, { error: 'Method not allowed' })

  try {
    requireAuth(event)
  } catch (err) {
    return respond(401, { error: err.message })
  }

  let body
  try {
    body = JSON.parse(event.body || '{}')
  } catch {
    return respond(400, { error: 'Invalid JSON body' })
  }

  const { teamId, teamName, projectTitle, url, techStack, problemStatement, eventId } = body
  if (!teamId || !url) {
    return respond(400, { error: 'teamId and url are required' })
  }

  const apiKey = process.env.GEMINI_API_KEY

  try {
    // Step 1: Scrape the live URL
    console.log(`Scraping: ${url}`)
    const pageData = await scrapePage(url)
    console.log(`Scrape result: status=${pageData.statusCode}, accessible=${pageData.accessible}`)

    // Step 2: Build Gemini prompt
    const prompt = buildPrompt(pageData, teamName, projectTitle, techStack)

    let aiResult
    try {
      if (!apiKey || apiKey === 'PASTE_YOUR_GEMINI_KEY_HERE') {
        throw new Error('No valid API key provided')
      }
      const genAI = new GoogleGenerativeAI(apiKey)
      const model = genAI.getGenerativeModel({
        model: 'gemini-2.0-flash',
        generationConfig: {
          responseMimeType: 'application/json',
          temperature: 0.3,
          maxOutputTokens: 2048,
        },
      })

      const result = await model.generateContent(prompt)
      const rawText = result.response.text().trim()
      aiResult = JSON.parse(rawText)
    } catch (apiErr) {
      console.warn('Gemini API failed or key missing, using smart heuristic analysis:', apiErr.message)
      // Smart heuristic fallback — generates team-specific insights
      aiResult = buildHeuristicResult(pageData, teamName, projectTitle, techStack, problemStatement)
    }

    // Step 5: Validate and clamp scores
    const CRITERIA = ['functionality', 'ui_ux', 'innovation', 'impact', 'technical_architecture']
    const scores = aiResult.scores || {}
    let total = 0
    CRITERIA.forEach(k => {
      if (!scores[k]) scores[k] = { score: 0, reason: 'Not evaluated' }
      scores[k].score = Math.min(10, Math.max(0, Math.round(Number(scores[k].score) || 0)))
      total += scores[k].score
    })
    aiResult.total_ai_score = total
    aiResult.scores = scores

    // Attach scrape metadata to flags if page had issues
    if (!pageData.accessible) {
      aiResult.flags = aiResult.flags || []
      if (!aiResult.flags.some(f => f.toLowerCase().includes('not accessible'))) {
        aiResult.flags.unshift(`Page returned HTTP ${pageData.statusCode || 'timeout/error'}`)
      }
    }

    // Step 6: Save to store
    await saveAIScore(teamId, aiResult, eventId || null)

    return respond(200, aiResult)

  } catch (err) {
    console.error('Analyze error:', err)
    return respond(500, { error: err.message || 'Analysis failed' })
  }
}
