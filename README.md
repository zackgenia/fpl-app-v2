# FPL Transfer Recommender v2

An advanced Fantasy Premier League transfer recommendation tool with comprehensive predictions.

## ✨ Features

### Smart Transfer Recommendations
- **"Why this transfer?"** - Clear explanations for every recommendation
- **Strategy selector** - Max points, best value, low risk, or differentials
- **Baseline comparison** - See how transfers improve your squad
- **Confidence ratings** - Visual bars + detailed factors

### Interactive Fixture Tracker
- **Team hover cards** - See star players, goal threats, clean sheet odds
- **Club badges** - Full visual team branding
- **FDR color coding** - Green (easy) → Red (hard)
- **Best/worst fixture runs** - Quick picks at a glance

### Live Updates
- Real-time gameweek data polling
- Auto-refresh every 60 seconds during matches

### Enhanced UX
- Skeleton loading states
- Progress indicators
- Graceful error handling with retry
- Mobile responsive design

---

## 🚀 Deploy to Render (FREE - 5 minutes!)

### Step 1: Upload to GitHub

1. Go to **https://github.com/new**
2. Name it `fpl-recommender` → Create repository
3. Click **"uploading an existing file"**
4. Extract this zip and drag **all contents** into GitHub:
   - `client/` folder
   - `server.js`
   - `package.json`
   - `README.md`
5. Click **Commit changes**

### Step 2: Deploy on Render

1. Go to **https://render.com** → Sign up with GitHub
2. Click **New +** → **Web Service**
3. Select your `fpl-recommender` repo
4. Settings:
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm start`
5. Click **Create Web Service**
6. Wait 3-5 minutes

### Step 3: Share! 🎉

Your app will be live at `https://fpl-recommender.onrender.com`

---

## 💻 Run Locally

```bash
npm install
cd client && npm install && cd ..
npm run build
npm start
```

Open **http://localhost:3000**

---

## 📊 Prediction Model

The AI considers:
- **Expected Goals/Assists (xG/xA)** per 90 minutes
- **Fixture Difficulty Rating (FDR)** with position weighting
- **Team Momentum** - Last 5 results weighted by recency
- **Clean Sheet Probability** - Defense vs attack strength
- **Minutes Consistency** - Rotation risk detection
- **Form Trend** - Rising/stable/falling patterns
- **Set Piece Duties** - Penalties, corners, free kicks

---

## 🛠 Tech Stack

- **Frontend**: React + TypeScript + Tailwind CSS + Vite
- **Backend**: Node.js + Express
- **Data**: Official FPL API with intelligent caching

---

## 📦 Data Platform (Epic 2)

### Sources
- **FPL official data** (runtime proxy, core truth).
- **Understat** xG/xA/team xG/xGA (ingested via scheduled snapshot).
- **FBref-like advanced stats** (optional snapshot stub only).
- **Betting odds** (optional provider interface + mock provider).

### Runtime vs ingestion
- **Runtime**: `/api/fpl/*` proxies FPL endpoints with cache TTLs and `/api/metrics/*` serves normalized metrics.
- **Ingested snapshots**: `/data/understat`, `/data/fbref`, `/data/odds` are read locally by the backend.
- **No runtime scraping**: snapshot scripts are the only place where external data is fetched.

### Scripts
```bash
node scripts/understat_fetch.js [season]
node scripts/fbref_fetch.js
node scripts/odds_fetch.js
```

### Feature flags
Set environment variables to enable optional sources:
```bash
ENABLE_UNDERSTAT=true
ENABLE_FBREF=true
ENABLE_ODDS=true
UNDERSTAT_SEASON=2024
FBREF_SEASON=2024
```

### Mapping overrides
Manual player mapping overrides live in `data/mappings/player_overrides.json` and are applied when matching FPL players to Understat entries.

### Scheduled snapshots (optional)
GitHub Actions workflow `.github/workflows/understat_snapshot.yml` runs `scripts/understat_fetch.js` daily and uploads the JSON snapshot as an artifact. If you prefer committing snapshots instead, run the script locally and commit the file in `data/understat/`.

---

Built with ❤️ for FPL managers
