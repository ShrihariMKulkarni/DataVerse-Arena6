# Hack's AI Judge ⬡

> AI-powered hackathon project evaluation platform  
> DataVerse Club · Sapthagiri NPS University, Bengaluru

---

## What It Does

Teams build projects in 8 hours during Hackverse. This platform:
- Lets teams **register** their live project URLs
- Lets judges **manually score** teams (100 pts across 6 criteria)
- Uses **Claude AI** to automatically score each team (50 pts) by visiting their live URL
- Shows a **live leaderboard** with real-time rankings (total = 150 pts)

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React + Vite + TailwindCSS |
| Backend | Netlify Serverless Functions (Node.js) |
| Database | Google Sheets API v4 |
| AI | **Google Gemini 2.0 Flash** (free) + built-in URL scraper |
| Auth | JWT (shared admin password) |
| Hosting | Netlify (single deployment) |

---

## Project Structure

```
AI Analyser/
├── src/                        # React frontend
│   ├── pages/
│   │   ├── Login.jsx           # /login — Judge login
│   │   ├── Register.jsx        # /register — Public team registration
│   │   ├── Dashboard.jsx       # /dashboard — Judge panel (protected)
│   │   ├── Leaderboard.jsx     # /leaderboard — Live rankings (public)
│   │   └── TeamDetail.jsx      # /team/:teamId — Full score breakdown (public)
│   ├── components/
│   │   ├── Navbar.jsx
│   │   ├── TeamCard.jsx        # Score panel + AI trigger
│   │   ├── ScorePanel.jsx      # Judge scoring sliders
│   │   ├── AIScoreDisplay.jsx  # AI result breakdown
│   │   ├── Toast.jsx
│   │   └── LoadingSkeleton.jsx
│   ├── context/
│   │   ├── AuthContext.jsx     # JWT session management
│   │   └── ToastContext.jsx    # Global notifications
│   └── utils/
│       └── api.js              # API client
├── netlify/functions/          # Serverless backend
│   ├── auth.js                 # POST /auth — Login
│   ├── teams.js                # GET/POST /teams
│   ├── analyze.js              # POST /analyze — AI analysis
│   ├── scores.js               # POST /scores — Judge scores
│   ├── leaderboard.js          # GET /leaderboard
│   ├── config.js               # GET/POST /config
│   └── _utils/
│       ├── sheets.js           # Google Sheets CRUD
│       └── auth.js             # JWT utilities
├── netlify.toml
├── package.json
├── .env.example
└── README.md
```

---

## Initial Setup

### Step 1 — Google Sheets Setup

1. Create a new Google Spreadsheet
2. Create **4 tabs** named exactly:
   - `Teams`
   - `JudgeScores`
   - `AIScores`
   - `Config`
3. In the `Config` tab, add these rows (the app can pre-populate headers automatically):

   | key | value |
   |-----|-------|
   | registrationOpen | true |
   | registrationDeadline | 2026-04-25T10:00:00+05:30 |
   | hackathonDate | April 25, 2026 |
   | allowedJudgeEmails | judge1@gmail.com,judge2@gmail.com |
   | adminPassword | (leave blank — use env var instead) |

4. Copy the **Spreadsheet ID** from the URL:
   `https://docs.google.com/spreadsheets/d/`**`<THIS_IS_YOUR_ID>`**`/edit`

### Step 2 — Google Service Account

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a new project (or use existing)
3. Enable the **Google Sheets API**
4. Go to **IAM & Admin → Service Accounts** → Create service account
5. Name it (e.g., `hackverse-judge`)
6. Create a JSON key — download it
7. From the JSON key, extract:
   - `client_email` → `GOOGLE_SERVICE_ACCOUNT_EMAIL`
   - `private_key` → `GOOGLE_PRIVATE_KEY`
8. **Share your Google Sheet** with the service account email (Editor access)

### Step 3 — Anthropic API Key

1. Go to [console.anthropic.com](https://console.anthropic.com)
2. Create an API key
3. Ensure your account has access to `claude-sonnet-4-20250514` and `web_search` tool

### Step 4 — Install Dependencies

```bash
npm install
```

### Step 5 — Environment Variables

```bash
cp .env.example .env
# Fill in your values
```

---

## Local Development

```bash
# Install Netlify CLI globally (if not installed)
npm install -g netlify-cli

# Start local development server (Vite + Netlify functions)
npm run dev
```

This starts:
- React dev server on `http://localhost:3000`
- Netlify functions on `http://localhost:8888/.netlify/functions/`

> **Note:** You need a `.env` file with all variables set for functions to work locally.

---

## Netlify Deployment

### Option A — Deploy via Netlify CLI

```bash
# Login to Netlify
netlify login

# Initialize & deploy
netlify init
netlify deploy --prod
```

### Option B — Deploy via Netlify Dashboard

1. Push your code to GitHub
2. Go to [app.netlify.com](https://app.netlify.com) → New site → Import from Git
3. Configure:
   - **Build command:** `npm run build`
   - **Publish directory:** `dist`
   - **Functions directory:** `netlify/functions` (auto-detected from `netlify.toml`)
4. Add all environment variables in **Site Settings → Environment Variables**:

| Variable | Description |
|----------|-------------|
| `GEMINI_API_KEY` | Free Gemini key from https://aistudio.google.com |
| `GOOGLE_SHEETS_ID` | `1UnqraJFJKD9rFQd2SgRBy9uSBWpJzPWdesnNvhAY3Ac` |
| `GOOGLE_SERVICE_ACCOUNT_EMAIL` | Service account email |
| `GOOGLE_PRIVATE_KEY` | Service account private key (with `\n` for newlines) |
| `ADMIN_PASSWORD` | Shared password for all judges |
| `JWT_SECRET` | Random 32+ char string |
| `VITE_API_BASE` | `/.netlify/functions` |
| `VITE_REGISTRATION_DEADLINE` | ISO datetime (optional) |

5. Trigger a deploy

---

## How to Add / Remove Judge Emails

**Via Google Sheets Config tab:**
- Edit the `allowedJudgeEmails` row → change value to comma-separated emails
- Example: `judge1@gmail.com,professor@sapthagiri.ac.in,organizer@dataverse.club`

**Via Admin API (if registered):**
```bash
curl -X POST https://your-site.netlify.app/.netlify/functions/config \
  -H "Authorization: Bearer <your_jwt_token>" \
  -H "Content-Type: application/json" \
  -d '{"allowedJudgeEmails": ["judge1@gmail.com", "judge2@gmail.com"]}'
```

> If `allowedJudgeEmails` list is **empty**, any email with the correct `ADMIN_PASSWORD` can log in.

---

## Scoring System

| Component | Points | Criteria |
|-----------|--------|---------|
| **Judge Score** | /100 | Problem Understanding (20) + Functionality (30) + UI/UX (15) + Innovation (15) + Impact (10) + Presentation (10) |
| **AI Score** | /50 | Live Functionality (10) + UI/UX Polish (10) + Innovation (10) + Real-world Impact (10) + Technical Depth (10) |
| **Total** | **/150** | |

---

## Pages

| Route | Access | Description |
|-------|--------|-------------|
| `/` | Public | Redirects to leaderboard |
| `/register` | Public | Team registration form |
| `/leaderboard` | Public | Live ranked leaderboard (auto-polls every 8s) |
| `/team/:teamId` | Public | Full score breakdown for a team |
| `/login` | Public | Judge login |
| `/dashboard` | Auth only | Judge scoring panel + AI analysis trigger |

---

## Google Sheets Structure

### Teams tab
`teamId | teamName | leaderName | members | problemStatement | projectTitle | liveUrl | techStack | registeredAt`

### JudgeScores tab
`teamId | problemIdea | functionality | uiUx | innovation | impact | presentation | total | scoredBy | scoredAt`

### AIScores tab
`teamId | func_score | func_reason | uiux_score | uiux_reason | innov_score | innov_reason | impact_score | impact_reason | tech_score | tech_reason | total_ai_score | detected_stack | verdict | top_strengths | key_improvements | flags | analyzedAt`

### Config tab
`key | value`

---

## Troubleshooting

**`GOOGLE_PRIVATE_KEY` format issue on Netlify:**  
The private key must have literal newlines, not `\n`. In the Netlify dashboard, paste the key exactly as-is from the JSON file (with real line breaks).

**Functions timeout during AI analysis:**  
AI analysis can take 30–60 seconds. Netlify's default function timeout is 10s. Upgrade to a **paid Netlify plan** (26s timeout) or enable **Background Functions** for longer runs.

**"Registration closed" error:**  
A judge can toggle registration open/closed from the Dashboard using the button at the top right.

**Leaderboard not updating:**  
The leaderboard polls every 8 seconds. Wait a moment after scores are saved.

---

## Hackverse 2026 — DataVerse Club

*Sapthagiri NPS University, Bengaluru · April 25, 2026*
