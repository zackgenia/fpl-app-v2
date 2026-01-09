const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const {
  buildTeamStrength,
  projectFixture,
  projectPlayer,
  projectTeam,
  loadUnderstatSnapshot,
  loadOddsSnapshot,
  buildUnderstatMaps,
  buildOddsMap,
} = require('./shared/insights');

// ===================
// FOOTBALL-DATA.ORG INTEGRATION
// ===================
function loadFootballDataSnapshot() {
  const snapshotPath = path.join(__dirname, 'data/football-data/premier-league.json');
  if (!fs.existsSync(snapshotPath)) {
    console.log('Football-Data snapshot not found');
    return null;
  }
  try {
    const data = JSON.parse(fs.readFileSync(snapshotPath, 'utf8'));
    console.log(`✓ Loaded Football-Data: ${data.standings?.length || 0} teams`);
    return data;
  } catch (err) {
    console.error('Failed to load Football-Data:', err.message);
    return null;
  }
}

function matchFootballDataTeam(fplTeam, standings) {
  if (!standings || !fplTeam) return null;
  const fplName = fplTeam.name?.toLowerCase() || '';
  const abbrevs = {
    'man city': 'manchester city', 'man utd': 'manchester united',
    'spurs': 'tottenham', 'wolves': 'wolverhampton',
    'brighton': 'brighton & hove albion', "nott'm forest": 'nottingham forest',
    'west ham': 'west ham united', 'newcastle': 'newcastle united',
  };
  const expanded = abbrevs[fplName] || fplName;
  return standings.find(t => {
    const fdName = t.teamName?.toLowerCase().replace(' fc', '').replace(' afc', '') || '';
    return fdName.includes(expanded) || expanded.includes(fdName) || fdName.includes(fplName);
  });
}

let footballDataSnapshot = null;

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// ===================
// CACHE SYSTEM
// ===================
class Cache {
  constructor(ttlMs = 300000) {
    this.cache = new Map();
    this.ttl = ttlMs;
  }
  get(key) {
    const item = this.cache.get(key);
    if (!item) return null;
    if (Date.now() > item.expiry) {
      this.cache.delete(key);
      return null;
    }
    return item.value;
  }
  set(key, value, customTtl) {
    this.cache.set(key, { value, expiry: Date.now() + (customTtl || this.ttl) });
  }
  clear() {
    this.cache.clear();
  }
}

const cache = new Cache(300000);
const longCache = new Cache(1800000);
const insightsCache = new Cache(90000);

// ===================
// FPL API SERVICE
// ===================
const FPL_BASE_URL = 'https://fantasy.premierleague.com/api';

async function fetchFPL(endpoint, retries = 3) {
  const cached = cache.get(endpoint);
  if (cached) return cached;

  let lastError;
  for (let i = 0; i < retries; i++) {
    try {
      const response = await fetch(`${FPL_BASE_URL}${endpoint}`, {
        headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) FPL-App/2.0' }
      });
      if (!response.ok) throw new Error(`FPL API error: ${response.status}`);
      const data = await response.json();
      cache.set(endpoint, data);
      return data;
    } catch (err) {
      lastError = err;
      if (i < retries - 1) await new Promise(r => setTimeout(r, 1000 * (i + 1)));
    }
  }
  throw lastError;
}

async function getBootstrap() { return fetchFPL('/bootstrap-static/'); }
async function getFixtures() { return fetchFPL('/fixtures/'); }
async function getPlayerSummary(playerId) { return fetchFPL(`/element-summary/${playerId}/`); }
async function getLiveGameweek(gw) { return fetchFPL(`/event/${gw}/live/`); }

// ===================
// DATA STORES
// ===================
let teamsById = new Map();
let teamsByCode = new Map();
let fixturesData = [];
let teamMomentum = new Map();
let teamStats = new Map();
let teamStrength = new Map();

// Get badge URL using team.code (not team.id)
function getTeamBadgeUrl(team) {
  if (!team || !team.code) return '';
  return `https://resources.premierleague.com/premierleague/badges/50/t${team.code}.png`;
}

async function loadData() {
  const cacheKey = 'loaded_data_v5';
  if (longCache.get(cacheKey)) return;

  const bootstrap = await getBootstrap();
  const fixtures = await getFixtures();

  // Load Football-Data.org snapshot for accurate season stats
  footballDataSnapshot = loadFootballDataSnapshot();

  // Map teams by both ID and code
  teamsById = new Map(bootstrap.teams.map(t => [t.id, t]));
  teamsByCode = new Map(bootstrap.teams.map(t => [t.code, t]));
  fixturesData = fixtures;

  // Get finished fixtures for analysis
  const finished = fixtures.filter(f => f.finished && f.team_h_score !== null)
    .sort((a, b) => (b.event ?? 0) - (a.event ?? 0));

  // Calculate team momentum from last 5 games (weighted by recency)
  const teamResults = new Map();
  for (const f of finished.slice(0, 200)) {
    const homeWin = f.team_h_score > f.team_a_score;
    const awayWin = f.team_a_score > f.team_h_score;
    const draw = f.team_h_score === f.team_a_score;

    if (!teamResults.has(f.team_h)) teamResults.set(f.team_h, []);
    if (!teamResults.has(f.team_a)) teamResults.set(f.team_a, []);

    teamResults.get(f.team_h).push({
      points: homeWin ? 3 : draw ? 1 : 0,
      scored: f.team_h_score,
      conceded: f.team_a_score,
      isHome: true,
      opponent: f.team_a,
      gw: f.event
    });
    teamResults.get(f.team_a).push({
      points: awayWin ? 3 : draw ? 1 : 0,
      scored: f.team_a_score,
      conceded: f.team_h_score,
      isHome: false,
      opponent: f.team_h,
      gw: f.event
    });
  }

  // Calculate comprehensive team stats
  for (const team of bootstrap.teams) {
    const results = teamResults.get(team.id) || [];
    const last5 = results.slice(0, 5);
    const last10 = results.slice(0, 10);

    // Momentum (weighted recent results)
    let momentum = 0;
    last5.forEach((r, i) => {
      momentum += r.points * (5 - i); // More recent = higher weight
    });
    teamMomentum.set(team.id, last5.length > 0 ? momentum / 45 : 0.5);

    // Detailed stats from last 10 games
    const homeGames = last10.filter(r => r.isHome);
    const awayGames = last10.filter(r => !r.isHome);

    const cleanSheets = last10.filter(r => r.conceded === 0).length;
    const homeCleanSheets = homeGames.filter(r => r.conceded === 0).length;
    const awayCleanSheets = awayGames.filter(r => r.conceded === 0).length;

    // Try to get accurate season stats from Football-Data.org
    const fdTeam = footballDataSnapshot?.standings
      ? matchFootballDataTeam(team, footballDataSnapshot.standings)
      : null;

    // Use Football-Data.org for accurate season-wide per-game stats, fallback to FPL data
    let goalsPerGame, concededPerGame, played;
    if (fdTeam && fdTeam.playedGames > 0) {
      played = fdTeam.playedGames;
      goalsPerGame = fdTeam.goalsFor / fdTeam.playedGames;
      concededPerGame = fdTeam.goalsAgainst / fdTeam.playedGames;
    } else {
      // Fallback to FPL last 10 games
      played = last10.length;
      const totalScored = last10.reduce((s, r) => s + r.scored, 0);
      const totalConceded = last10.reduce((s, r) => s + r.conceded, 0);
      goalsPerGame = last10.length > 0 ? totalScored / last10.length : 0;
      concededPerGame = last10.length > 0 ? totalConceded / last10.length : 0;
    }

    teamStats.set(team.id, {
      played,
      cleanSheets,
      cleanSheetRate: last10.length > 0 ? cleanSheets / last10.length : 0,
      homeCleanSheetRate: homeGames.length > 0 ? homeCleanSheets / homeGames.length : 0,
      awayCleanSheetRate: awayGames.length > 0 ? awayCleanSheets / awayGames.length : 0,
      goalsPerGame,
      concededPerGame,
      homeGoalsPerGame: homeGames.length > 0 ? homeGames.reduce((s, r) => s + r.scored, 0) / homeGames.length : 0,
      awayGoalsPerGame: awayGames.length > 0 ? awayGames.reduce((s, r) => s + r.scored, 0) / awayGames.length : 0,
      homeConcededPerGame: homeGames.length > 0 ? homeGames.reduce((s, r) => s + r.conceded, 0) / homeGames.length : 0,
      awayConcededPerGame: awayGames.length > 0 ? awayGames.reduce((s, r) => s + r.conceded, 0) / awayGames.length : 0,
      form: last5.reduce((s, r) => s + r.points, 0), // Out of 15
      last5Results: last5.map(r => r.points === 3 ? 'W' : r.points === 1 ? 'D' : 'L').join(''),
    });

    // Team strength from FPL API
    teamStrength.set(team.id, {
      overall: team.strength,
      homeAttack: team.strength_attack_home,
      homeDefence: team.strength_defence_home,
      awayAttack: team.strength_attack_away,
      awayDefence: team.strength_defence_away,
    });
  }

  longCache.set(cacheKey, true);
}

async function getInsightsContext(bootstrap) {
  const cached = insightsCache.get('context');
  if (cached) return cached;

  const understatSnapshot = await loadUnderstatSnapshot();
  const oddsSnapshot = await loadOddsSnapshot();
  const understatMaps = buildUnderstatMaps(understatSnapshot);
  const oddsMap = buildOddsMap(oddsSnapshot);
  const { strengthMap, avgGoalsPerGame } = buildTeamStrength({
    teams: bootstrap.teams,
    teamStats,
    understatTeams: understatMaps.teams,
  });

  const context = {
    understatMaps,
    oddsMap,
    strengthMap,
    avgGoalsPerGame,
  };

  insightsCache.set('context', context, 60000);
  return context;
}

// ===================
// CLEAN SHEET CALCULATION - More robust
// ===================
function calculateCleanSheetProbability(teamId, opponentId, isHome) {
  const teamStat = teamStats.get(teamId);
  const oppStat = teamStats.get(opponentId);
  const teamStr = teamStrength.get(teamId);
  const oppStr = teamStrength.get(opponentId);

  if (!teamStat || !oppStat || !teamStr || !oppStr) return 25; // Default

  // Base rate from team's actual clean sheet record
  const baseRate = isHome ? teamStat.homeCleanSheetRate : teamStat.awayCleanSheetRate;
  
  // Opponent's scoring rate
  const oppScoringRate = isHome ? oppStat.awayGoalsPerGame : oppStat.homeGoalsPerGame;
  
  // Strength comparison (defence vs attack)
  const defStrength = isHome ? teamStr.homeDefence : teamStr.awayDefence;
  const oppAttStrength = isHome ? oppStr.awayAttack : oppStr.homeAttack;
  
  // Calculate probability
  let prob = baseRate * 100;
  
  // Adjust based on opponent's attacking threat
  if (oppScoringRate > 2) prob *= 0.6;
  else if (oppScoringRate > 1.5) prob *= 0.75;
  else if (oppScoringRate > 1) prob *= 0.9;
  else if (oppScoringRate < 0.8) prob *= 1.2;
  
  // Adjust based on strength differential
  const strengthDiff = defStrength - oppAttStrength;
  prob += strengthDiff / 20;
  
  // Clamp between 5% and 60%
  return Math.round(Math.max(5, Math.min(60, prob)));
}

// ===================
// GOAL PROBABILITY CALCULATION
// ===================
function calculateGoalProbability(player, opponentId, isHome) {
  const oppStat = teamStats.get(opponentId);
  const oppStr = teamStrength.get(opponentId);
  
  if (!oppStat || !oppStr) return Math.round((player.expected_goals_per_90 || 0) * 100);

  // Base from xG per 90
  let baseProb = (player.expected_goals_per_90 || 0) * 100;
  
  // Opponent's defensive record
  const oppConcededRate = isHome ? oppStat.awayConcededPerGame : oppStat.homeConcededPerGame;
  
  // Adjust based on how leaky the opponent is
  if (oppConcededRate > 2) baseProb *= 1.4;
  else if (oppConcededRate > 1.5) baseProb *= 1.2;
  else if (oppConcededRate < 0.8) baseProb *= 0.7;
  else if (oppConcededRate < 1) baseProb *= 0.85;
  
  // Penalty taker bonus
  if (player.penalties_order !== null && player.penalties_order <= 1) {
    baseProb += 8;
  }
  
  return Math.round(Math.max(0, Math.min(80, baseProb)));
}

// ===================
// PREDICTION ENGINE
// ===================
const POSITION_MAP = { 1: 'GK', 2: 'DEF', 3: 'MID', 4: 'FWD' };
const POINTS_SYSTEM = {
  GK: { cleanSheet: 4, goal: 6, assist: 3, save: 0.33, goalConceded: -0.5 },
  DEF: { cleanSheet: 4, goal: 6, assist: 3, goalConceded: -0.5 },
  MID: { cleanSheet: 1, goal: 5, assist: 3, goalConceded: 0 },
  FWD: { cleanSheet: 0, goal: 4, assist: 3, goalConceded: 0 },
};

function getFdrMultiplier(fdr, position) {
  const factor = position === 'FWD' ? 0.7 : position === 'MID' ? 0.8 : 1.0;
  switch (fdr) {
    case 1: return 1 + (0.30 * factor);
    case 2: return 1 + (0.12 * factor);
    case 3: return 1.0;
    case 4: return 1 - (0.10 * factor);
    case 5: return 1 - (0.20 * factor);
    default: return 1.0;
  }
}

function calculateFormTrend(history) {
  if (history.length < 4) return 'stable';
  const recent = history.slice(-3).reduce((s, h) => s + h.total_points, 0) / 3;
  const earlier = history.slice(-6, -3).reduce((s, h) => s + h.total_points, 0) / Math.min(3, history.slice(-6, -3).length || 1);
  const diff = recent - earlier;
  return diff > 1.5 ? 'rising' : diff < -1.5 ? 'falling' : 'stable';
}

function getConfidenceLabel(confidence) {
  if (confidence >= 80) return { label: 'High confidence', color: 'green', icon: '🛡️' };
  if (confidence >= 60) return { label: 'Medium confidence', color: 'yellow', icon: '⚠️' };
  return { label: 'Higher risk', color: 'red', icon: '🎲' };
}

async function calculatePrediction(player, horizon = 5) {
  await loadData();

  const team = teamsById.get(player.team);
  const summary = await getPlayerSummary(player.id);
  const history = summary.history;
  const upcoming = summary.fixtures.slice(0, horizon);
  const position = POSITION_MAP[player.element_type];
  const pts = POINTS_SYSTEM[position];

  // IMPROVED: Smart minutes calculation that handles returning players
  const sortedHistory = [...history].sort((a, b) => (b.round ?? 0) - (a.round ?? 0));
  const recentHistory = sortedHistory.slice(0, 5);

  // Detect returning player: recent 0-minute games followed by games with minutes
  const gamesWithMinutes = recentHistory.filter(h => (h.minutes ?? 0) > 0);
  const gamesWithZero = recentHistory.filter(h => (h.minutes ?? 0) === 0);
  const isReturning = gamesWithZero.length >= 2 && gamesWithMinutes.length >= 1;

  // For returning players, use games where they actually played
  let avgMinutes;
  if (isReturning) {
    const fitGames = sortedHistory.filter(h => (h.minutes ?? 0) >= 45).slice(0, 10);
    avgMinutes = fitGames.length > 0
      ? fitGames.reduce((s, h) => s + h.minutes, 0) / fitGames.length
      : 75;
  } else {
    avgMinutes = recentHistory.length > 0
      ? recentHistory.reduce((s, h) => s + h.minutes, 0) / recentHistory.length
      : 45;
  }

  const availability = player.chance_of_playing_next_round ?? 100;
  const minutesProb = Math.min(avgMinutes / 90, 1) * Math.pow(availability / 100, 0.5);

  // IMPROVED: Base form score that accounts for returning players
  // Use games where they actually played
  const recentPlayedGames = sortedHistory.filter(h => (h.minutes ?? 0) > 0).slice(0, 5);
  const baseScore = recentPlayedGames.length > 0
    ? recentPlayedGames.reduce((s, h) => s + h.total_points, 0) / recentPlayedGames.length
    : 2;

  // Season average as anchor
  const seasonAvgPoints = player.total_points && history.length > 0
    ? player.total_points / Math.max(history.filter(h => (h.minutes ?? 0) > 0).length, 1)
    : baseScore;

  // Form trend - use smarter calculation for returning players
  const formTrend = isReturning ? 'stable' : calculateFormTrend(sortedHistory.filter(h => (h.minutes ?? 0) > 0));

  // Form multiplier is softer - season baseline matters more
  const formMult = formTrend === 'rising' ? 1.06 : formTrend === 'falling' ? 0.94 : 1.0;

  // Team momentum
  const momentum = teamMomentum.get(player.team) ?? 0.5;
  const momentumMult = 0.92 + (momentum * 0.16); // Range: 0.92 to 1.08

  let totalPoints = 0;
  const fixtureDetails = [];

  for (const fix of upcoming) {
    const oppId = fix.is_home ? fix.team_a : fix.team_h;
    const opp = teamsById.get(oppId);
    const fdrMult = getFdrMultiplier(fix.difficulty, position);

    // Clean sheet probability
    const csProb = calculateCleanSheetProbability(player.team, oppId, fix.is_home) / 100;

    // Goal/assist probability
    const goalProb = calculateGoalProbability(player, oppId, fix.is_home) / 100;
    const assistProb = (player.expected_assists_per_90 || 0) * 
      (fix.is_home ? 1.1 : 0.9) * 
      (teamStats.get(oppId)?.awayConcededPerGame > 1.5 ? 1.2 : 1);

    // Calculate expected points for this fixture
    let fixPoints = 2 * minutesProb; // Appearance
    fixPoints += pts.cleanSheet * csProb * minutesProb;
    fixPoints += pts.goal * goalProb * minutesProb;
    fixPoints += pts.assist * assistProb * minutesProb;
    
    // Bonus estimate
    const avgBonus = history.length > 0 
      ? history.slice(-10).reduce((s, h) => s + h.bonus, 0) / Math.min(10, history.length)
      : 0;
    fixPoints += avgBonus * minutesProb;

    // Apply multipliers
    fixPoints *= fdrMult * formMult * momentumMult;

    totalPoints += Math.max(0, fixPoints);

    fixtureDetails.push({
      gameweek: fix.event,
      opponent: opp?.short_name ?? 'UNK',
      opponentId: oppId,
      opponentBadge: getTeamBadgeUrl(opp),
      isHome: fix.is_home,
      difficulty: fix.difficulty,
      expectedPoints: Math.round(fixPoints * 10) / 10,
      csChance: Math.round(csProb * 100),
      goalChance: Math.round(goalProb * 100),
      assistChance: Math.round(assistProb * 100),
    });
  }

  // Scale if fewer fixtures
  if (upcoming.length < horizon && upcoming.length > 0) {
    totalPoints = (totalPoints / upcoming.length) * horizon;
  }

  const avgFdr = upcoming.length > 0
    ? upcoming.reduce((s, f) => s + f.difficulty, 0) / upcoming.length
    : 3;

  const minutesRisk = 1 - minutesProb;

  // IMPROVED: Confidence calculation that reflects data quality
  const confidenceFactors = [];
  let confidenceScore = 0;

  // 1. Minutes security (0-30 points)
  // Based on how nailed the player is when fit
  const fitGames = sortedHistory.filter(h => (h.minutes ?? 0) > 0).slice(0, 10);
  const avgMinutesWhenPlaying = fitGames.length > 0
    ? fitGames.reduce((s, h) => s + h.minutes, 0) / fitGames.length
    : 60;
  const minutesSecurity = Math.min(avgMinutesWhenPlaying / 90, 1) * 30;
  confidenceScore += minutesSecurity;

  if (avgMinutesWhenPlaying < 60) {
    confidenceFactors.push({ text: 'Rotation risk', type: 'warning' });
  } else if (avgMinutesWhenPlaying >= 85) {
    confidenceFactors.push({ text: 'Nailed starter', type: 'positive' });
  }

  // 2. Sample size / track record (0-25 points)
  const gamesPlayed = fitGames.length;
  const sampleSizeScore = Math.min(gamesPlayed / 12, 1) * 25;
  confidenceScore += sampleSizeScore;

  if (gamesPlayed < 5) {
    confidenceFactors.push({ text: 'Limited match data', type: 'warning' });
  } else if (gamesPlayed >= 15) {
    confidenceFactors.push({ text: 'Strong sample size', type: 'positive' });
  }

  // 3. Availability (0-20 points)
  // Use softer penalty for availability
  const availabilityScore = Math.pow(availability / 100, 0.7) * 20;
  confidenceScore += availabilityScore;

  if (availability < 100 && availability > 0) {
    confidenceFactors.push({
      text: `${availability}% chance of playing`,
      type: availability < 50 ? 'danger' : availability < 75 ? 'warning' : 'info'
    });
  }

  // 4. Consistency (0-15 points) - based on points variance
  const pointsHistory = fitGames.map(h => h.total_points ?? 0);
  let consistencyScore = 15; // Default to good
  if (pointsHistory.length >= 3) {
    const mean = pointsHistory.reduce((a, b) => a + b, 0) / pointsHistory.length;
    const variance = pointsHistory.reduce((sum, p) => sum + Math.pow(p - mean, 2), 0) / pointsHistory.length;
    const cv = mean > 0 ? Math.sqrt(variance) / mean : 1; // Coefficient of variation
    consistencyScore = Math.max(0, 15 - (cv * 10)); // Lower CV = higher score
  }
  confidenceScore += consistencyScore;

  // 5. Form stability (0-10 points)
  let formScore = 10;
  if (formTrend === 'falling') {
    formScore = 4;
    confidenceFactors.push({ text: 'Form declining', type: 'danger' });
  } else if (formTrend === 'rising') {
    formScore = 8;
    confidenceFactors.push({ text: 'Form improving', type: 'positive' });
  }
  confidenceScore += formScore;

  // Bonus factors (can push above 100, capped)
  if (momentum > 0.65) {
    confidenceFactors.push({ text: 'Team in good form', type: 'positive' });
    confidenceScore += 3;
  }
  if (momentum < 0.35) {
    confidenceFactors.push({ text: 'Team struggling', type: 'warning' });
    confidenceScore -= 3;
  }

  // Returning player bonus - they should have higher confidence once back
  if (isReturning && gamesWithMinutes.some(h => (h.minutes ?? 0) >= 70)) {
    confidenceFactors.push({ text: 'Back from absence', type: 'info' });
    confidenceScore += 5;
  }

  // Premium player bonus - players with high total points have proven track record
  const totalSeasonPoints = player.total_points ?? 0;
  if (totalSeasonPoints >= 100) {
    confidenceScore += 5;
  }

  if (player.news) {
    confidenceFactors.push({ text: player.news.substring(0, 60), type: 'info' });
  }

  const confidence = Math.round(Math.min(100, Math.max(20, confidenceScore)));

  return {
    playerId: player.id,
    webName: player.web_name,
    teamId: player.team,
    teamShortName: team?.short_name ?? 'UNK',
    teamBadge: getTeamBadgeUrl(team),
    position,
    cost: player.now_cost,
    photoCode: player.code,
    predictedPointsN: Math.round(totalPoints * 10) / 10,
    predictedPointsPerGW: Math.round((totalPoints / horizon) * 10) / 10,
    confidence,
    confidenceLevel: getConfidenceLabel(confidence),
    confidenceFactors,
    form: Math.round(baseScore * 10) / 10,
    formTrend,
    fixtureScore: Math.round(avgFdr * 10) / 10,
    avgFdr: Math.round(avgFdr * 10) / 10,
    minutesRisk: Math.round(minutesRisk * 100),
    minutesPct: Math.round(minutesProb * 100),
    nextFixtures: fixtureDetails.map(f => ({ gameweek: f.gameweek, opponent: f.opponent, isHome: f.isHome, difficulty: f.difficulty })),
    fixtureDetails,
    status: player.status,
    chanceOfPlaying: player.chance_of_playing_next_round,
    selectedByPercent: player.selected_by_percent,
    penaltiesTaker: player.penalties_order !== null && player.penalties_order <= 1,
    setpieceTaker: player.corners_and_indirect_freekicks_order !== null && player.corners_and_indirect_freekicks_order <= 1,
    ictIndex: Math.round(parseFloat(player.ict_index || 0) * 10) / 10,
    expectedGoals: Math.round(parseFloat(player.expected_goals || 0) * 100) / 100,
    expectedAssists: Math.round(parseFloat(player.expected_assists || 0) * 100) / 100,
    expectedGoalInvolvements: Math.round(parseFloat(player.expected_goal_involvements || 0) * 100) / 100,
    totalPoints: player.total_points,
    goalsScored: player.goals_scored,
    assists: player.assists,
    cleanSheets: player.clean_sheets,
    bonus: player.bonus,
    valueScore: player.now_cost > 0 ? Math.round((totalPoints / (player.now_cost / 10)) * 100) / 100 : 0,
    teamMomentum: Math.round(momentum * 100),
  };
}

// ===================
// API ROUTES
// ===================

// Bootstrap
app.get('/api/bootstrap', async (req, res) => {
  try {
    const data = await getBootstrap();
    await loadData();
    
    const currentGW = data.events.find(gw => gw.is_current) ?? data.events.find(gw => gw.is_next);

    res.json({
      players: data.elements.map(p => ({
        id: p.id,
        webName: p.web_name,
        firstName: p.first_name,
        secondName: p.second_name,
        teamId: p.team,
        position: p.element_type,
        cost: p.now_cost,
        form: p.form,
        totalPoints: p.total_points,
        pointsPerGame: p.points_per_game,
        selectedByPercent: p.selected_by_percent,
        status: p.status,
        news: p.news,
        chanceOfPlaying: p.chance_of_playing_next_round,
        minutes: p.minutes,
        goals: p.goals_scored,
        assists: p.assists,
        cleanSheets: p.clean_sheets,
        penaltiesOrder: p.penalties_order,
        cornersOrder: p.corners_and_indirect_freekicks_order,
        photoCode: p.code,
        ictIndex: p.ict_index,
        expectedGoals: p.expected_goals,
        expectedAssists: p.expected_assists,
        threat: p.threat,
        creativity: p.creativity,
        influence: p.influence,
      })),
      teams: data.teams.map(t => ({
        id: t.id,
        name: t.name,
        shortName: t.short_name,
        strength: t.strength,
        badge: getTeamBadgeUrl(t),
        code: t.code,
      })),
      currentGameweek: currentGW?.id ?? 1,
      gameweeks: data.events.map(gw => ({
        id: gw.id,
        name: gw.name,
        deadlineTime: gw.deadline_time,
        finished: gw.finished,
        isCurrent: gw.is_current,
        isNext: gw.is_next,
      })),
    });
  } catch (error) {
    console.error('Bootstrap error:', error);
    res.status(503).json({ error: 'FPL servers busy', retryAfter: 5 });
  }
});

// Player detail
app.get('/api/player/:id', async (req, res) => {
  try {
    const playerId = parseInt(req.params.id);
    const horizon = parseInt(req.query.horizon) || 5;

    const bootstrap = await getBootstrap();
    const player = bootstrap.elements.find(p => p.id === playerId);
    if (!player) return res.status(404).json({ error: 'Player not found' });

    await loadData();
    const summary = await getPlayerSummary(playerId);
    const prediction = await calculatePrediction(player, horizon);

    const recentMatches = summary.history.slice(-5).map(h => {
      const opp = teamsById.get(h.opponent_team);
      return {
        gameweek: h.round,
        opponent: opp?.short_name ?? 'UNK',
        opponentBadge: getTeamBadgeUrl(opp),
        wasHome: h.was_home,
        points: h.total_points,
        minutes: h.minutes,
        goals: h.goals_scored,
        assists: h.assists,
        cleanSheet: h.clean_sheets > 0,
        bonus: h.bonus,
        xG: parseFloat(h.expected_goals),
        xA: parseFloat(h.expected_assists),
      };
    });

    res.json({ player: prediction, recentMatches });
  } catch (error) {
    console.error('Player error:', error);
    res.status(500).json({ error: 'Failed to fetch player' });
  }
});

app.get('/api/insights/player/:id', async (req, res) => {
  try {
    const playerId = parseInt(req.params.id);
    const horizon = parseInt(req.query.horizon) || 5;
    const cacheKey = `insights:player:${playerId}:${horizon}`;
    const cached = insightsCache.get(cacheKey);
    if (cached) return res.json(cached);

    const bootstrap = await getBootstrap();
    const player = bootstrap.elements.find(p => p.id === playerId);
    if (!player) return res.status(404).json({ error: 'Player not found' });

    await loadData();
    const summary = await getPlayerSummary(playerId);
    const context = await getInsightsContext(bootstrap);

    const fixtures = summary.fixtures.slice(0, horizon).map(fix => {
      const opponentId = fix.is_home ? fix.team_a : fix.team_h;
      const opponent = teamsById.get(opponentId);
      return {
        fixtureId: fix.id ?? fix.fixture ?? fix.event ?? 0,
        gameweek: fix.event,
        opponent: opponent?.short_name ?? 'UNK',
        opponentId,
        opponentBadge: getTeamBadgeUrl(opponent),
        isHome: fix.is_home,
        difficulty: fix.difficulty,
      };
    });

    const projection = projectPlayer({
      player: {
        ...player,
        position: POSITION_MAP[player.element_type],
        history: summary.history,
      },
      fixtures,
      strengthMap: context.strengthMap,
      avgGoalsPerGame: context.avgGoalsPerGame,
      understatPlayers: context.understatMaps.players,
      oddsMap: context.oddsMap,
    });

    const response = {
      ...projection,
      horizon,
      estimated: projection.estimated || context.understatMaps.players.size === 0,
    };

    insightsCache.set(cacheKey, response, 90000);
    res.json(response);
  } catch (error) {
    console.error('Insights player error:', error);
    res.status(500).json({ error: 'Failed to build player insights' });
  }
});

app.get('/api/insights/team/:id', async (req, res) => {
  try {
    const teamId = parseInt(req.params.id);
    const horizon = parseInt(req.query.horizon) || 5;
    const cacheKey = `insights:team:${teamId}:${horizon}`;
    const cached = insightsCache.get(cacheKey);
    if (cached) return res.json(cached);

    const bootstrap = await getBootstrap();
    await loadData();
    const context = await getInsightsContext(bootstrap);

    const fixtures = fixturesData
      .filter(f => f.event !== null && f.team_h && f.team_a)
      .filter(f => f.event >= (bootstrap.events.find(gw => gw.is_current)?.id ?? 1))
      .filter(f => f.team_h === teamId || f.team_a === teamId)
      .sort((a, b) => (a.event ?? 0) - (b.event ?? 0))
      .slice(0, horizon)
      .map(f => {
        const isHome = f.team_h === teamId;
        const opponentId = isHome ? f.team_a : f.team_h;
        const opponent = teamsById.get(opponentId);
        return {
          fixtureId: f.id,
          gameweek: f.event,
          opponent: opponent?.short_name ?? 'UNK',
          opponentId,
          isHome,
          difficulty: isHome ? f.team_h_difficulty : f.team_a_difficulty,
        };
      });

    const projection = projectTeam({
      teamId,
      fixtures,
      strengthMap: context.strengthMap,
      avgGoalsPerGame: context.avgGoalsPerGame,
      oddsMap: context.oddsMap,
    });

    const response = {
      ...projection,
      horizon,
      estimated: projection.estimated || context.understatMaps.teams.size === 0,
    };

    insightsCache.set(cacheKey, response, 90000);
    res.json(response);
  } catch (error) {
    console.error('Insights team error:', error);
    res.status(500).json({ error: 'Failed to build team insights' });
  }
});

app.get('/api/insights/fixture/:id', async (req, res) => {
  try {
    const fixtureId = parseInt(req.params.id);
    const horizon = parseInt(req.query.horizon) || 5;
    const cacheKey = `insights:fixture:${fixtureId}:${horizon}`;
    const cached = insightsCache.get(cacheKey);
    if (cached) return res.json(cached);

    const bootstrap = await getBootstrap();
    await loadData();
    const fixture = fixturesData.find(f => f.id === fixtureId);
    if (!fixture) return res.status(404).json({ error: 'Fixture not found' });

    const context = await getInsightsContext(bootstrap);
    const projection = projectFixture({
      fixture: {
        id: fixture.id,
        homeTeamId: fixture.team_h,
        awayTeamId: fixture.team_a,
      },
      teams: teamsById,
      strengthMap: context.strengthMap,
      avgGoalsPerGame: context.avgGoalsPerGame,
      oddsMap: context.oddsMap,
    });

    const homePlayers = bootstrap.elements.filter(p => p.team === fixture.team_h);
    const awayPlayers = bootstrap.elements.filter(p => p.team === fixture.team_a);

    const buildKeyPlayers = async (teamPlayers) => {
      // Filter to available players and sort by total points to prioritize key players
      const topPlayers = teamPlayers
        .filter(p => p.status === 'a' || p.status === 'd')
        .sort((a, b) => (b.total_points ?? 0) - (a.total_points ?? 0))
        .slice(0, 10); // Limit to top 10 to avoid too many API calls

      const results = await Promise.all(
        topPlayers.map(async (p) => {
          // Fetch player history for accurate projections
          let history = [];
          try {
            const summary = await getPlayerSummary(p.id);
            history = summary.history || [];
          } catch (e) {
            // Continue with empty history if fetch fails
          }

          const playerProjection = projectPlayer({
            player: {
              ...p,
              position: POSITION_MAP[p.element_type],
              history,
            },
            fixtures: [
              {
                fixtureId: fixture.id,
                gameweek: fixture.event ?? 1,
                opponent: '',
                opponentId: p.team === fixture.team_h ? fixture.team_a : fixture.team_h,
                opponentBadge: '',
                isHome: p.team === fixture.team_h,
                difficulty: p.team === fixture.team_h ? fixture.team_h_difficulty : fixture.team_a_difficulty,
              },
            ],
            strengthMap: context.strengthMap,
            avgGoalsPerGame: context.avgGoalsPerGame,
            understatPlayers: context.understatMaps.players,
            oddsMap: context.oddsMap,
          });

          return {
            id: p.id,
            name: p.web_name,
            position: POSITION_MAP[p.element_type],
            photoCode: p.code,
            xPts: playerProjection.xPts.nextFixture,
          };
        })
      );

      return results
        .sort((a, b) => b.xPts - a.xPts)
        .slice(0, 5);
    };

    // Build key players with full history data (parallel)
    const [homeKeyPlayers, awayKeyPlayers] = await Promise.all([
      buildKeyPlayers(homePlayers),
      buildKeyPlayers(awayPlayers),
    ]);

    const response = {
      fixtureId,
      homeTeamId: fixture.team_h,
      awayTeamId: fixture.team_a,
      homeXG: projection.homeXG,
      awayXG: projection.awayXG,
      homeCS: projection.homeCS,
      awayCS: projection.awayCS,
      attackIndex: {
        home: context.strengthMap.get(fixture.team_h)?.attackIndex ?? 1,
        away: context.strengthMap.get(fixture.team_a)?.attackIndex ?? 1,
      },
      defenceIndex: {
        home: context.strengthMap.get(fixture.team_h)?.defenceIndex ?? 1,
        away: context.strengthMap.get(fixture.team_a)?.defenceIndex ?? 1,
      },
      homeKeyPlayers,
      awayKeyPlayers,
      estimated: projection.estimated || context.understatMaps.players.size === 0,
      horizon,
    };

    insightsCache.set(cacheKey, response, 90000);
    res.json(response);
  } catch (error) {
    console.error('Insights fixture error:', error);
    res.status(500).json({ error: 'Failed to build fixture insights' });
  }
});

// Recommendations
app.post('/api/recommendations', async (req, res) => {
  try {
    const { squad, bank, horizon = 5, includeInjured = false, strategy = 'maxPoints' } = req.body;
    if (!squad || !Array.isArray(squad)) {
      return res.status(400).json({ error: 'Invalid squad' });
    }

    const bootstrap = await getBootstrap();
    await loadData();
    const currentGW = bootstrap.events.find(gw => gw.is_current)?.id ?? 1;

    // Calculate squad predictions
    const squadPredictions = new Map();
    let totalSquadPoints = 0;

    for (const sp of squad) {
      const player = bootstrap.elements.find(p => p.id === sp.id);
      if (player) {
        const pred = await calculatePrediction(player, horizon);
        squadPredictions.set(sp.id, pred);
        totalSquadPoints += pred.predictedPointsN;
      }
    }

    // Top targets by position
    const positions = ['GK', 'DEF', 'MID', 'FWD'];
    const topTargetsByPosition = [];

    for (const pos of positions) {
      const posCode = { GK: 1, DEF: 2, MID: 3, FWD: 4 }[pos];
      const players = bootstrap.elements.filter(p =>
        p.element_type === posCode &&
        (includeInjured || p.status === 'a' || p.status === 'd')
      );

      const predictions = await Promise.all(
        players.slice(0, 40).map(p => calculatePrediction(p, horizon))
      );

      let sorted;
      switch (strategy) {
        case 'value':
          sorted = predictions.sort((a, b) => b.valueScore - a.valueScore);
          break;
        case 'safety':
          sorted = predictions.sort((a, b) => b.confidence - a.confidence);
          break;
        case 'differential':
          sorted = predictions.sort((a, b) => parseFloat(a.selectedByPercent) - parseFloat(b.selectedByPercent));
          break;
        default:
          sorted = predictions.sort((a, b) => b.predictedPointsN - a.predictedPointsN);
      }

      topTargetsByPosition.push({
        position: pos,
        targets: sorted.slice(0, 10),
      });
    }

    // Calculate transfers with explanations
    const transfers = [];
    const squadIds = new Set(squad.map(p => p.id));
    const teamCounts = new Map();
    squad.forEach(p => {
      const player = bootstrap.elements.find(e => e.id === p.id);
      if (player) teamCounts.set(player.team, (teamCounts.get(player.team) ?? 0) + 1);
    });

    for (const sp of squad) {
      const currentPred = squadPredictions.get(sp.id);
      if (!currentPred) continue;

      const available = bank + sp.cost;
      const posTargets = topTargetsByPosition.find(t => t.position === sp.position)?.targets ?? [];

      for (const candidate of posTargets) {
        if (squadIds.has(candidate.playerId)) continue;
        if (candidate.cost > available) continue;

        const candPlayer = bootstrap.elements.find(p => p.id === candidate.playerId);
        if (!candPlayer) continue;

        const currentTeamId = bootstrap.elements.find(p => p.id === sp.id)?.team;
        const candTeamCount = teamCounts.get(candPlayer.team) ?? 0;
        if (candPlayer.team !== currentTeamId && candTeamCount >= 3) continue;

        const netGain = candidate.predictedPointsN - currentPred.predictedPointsN;

        const reasons = [];
        if (netGain > 0) {
          reasons.push({ type: 'positive', icon: '📈', text: `+${netGain.toFixed(1)} predicted points over ${horizon} GWs` });
        }
        if (candidate.avgFdr < currentPred.avgFdr - 0.3) {
          reasons.push({ type: 'positive', icon: '🟢', text: `Easier fixtures (FDR ${candidate.avgFdr} vs ${currentPred.avgFdr})` });
        }
        if (candidate.minutesPct > currentPred.minutesPct + 10) {
          reasons.push({ type: 'positive', icon: '⏱️', text: `Better minutes security (${candidate.minutesPct}% vs ${currentPred.minutesPct}%)` });
        }
        if (candidate.teamMomentum > currentPred.teamMomentum + 15) {
          reasons.push({ type: 'positive', icon: '🔥', text: `Team in better form (${candidate.teamMomentum}% momentum)` });
        }
        if (candidate.valueScore > currentPred.valueScore + 0.3) {
          reasons.push({ type: 'positive', icon: '💰', text: `Better value (${candidate.valueScore} vs ${currentPred.valueScore} pts/£m)` });
        }
        if (candidate.formTrend === 'rising' && currentPred.formTrend !== 'rising') {
          reasons.push({ type: 'positive', icon: '📊', text: 'Form improving' });
        }
        if (candidate.confidence > currentPred.confidence + 15) {
          reasons.push({ type: 'positive', icon: '🛡️', text: `More reliable (${candidate.confidence}% confidence)` });
        }

        if (netGain > 0 || reasons.length > 2) {
          transfers.push({
            playerOut: currentPred,
            playerIn: candidate,
            netGain: Math.round(netGain * 10) / 10,
            costChange: sp.cost - candidate.cost,
            budgetAfter: bank + sp.cost - candidate.cost,
            reasons,
            newSquadTotal: Math.round((totalSquadPoints - currentPred.predictedPointsN + candidate.predictedPointsN) * 10) / 10,
          });
        }
      }
    }

    switch (strategy) {
      case 'value':
        transfers.sort((a, b) => b.playerIn.valueScore - a.playerIn.valueScore);
        break;
      case 'safety':
        transfers.sort((a, b) => b.playerIn.confidence - a.playerIn.confidence);
        break;
      default:
        transfers.sort((a, b) => b.netGain - a.netGain);
    }

    res.json({
      bestTransfer: transfers[0] ?? null,
      topTransfers: transfers.slice(0, 10),
      topTargetsByPosition,
      currentGameweek: currentGW,
      horizon,
      squadBaseline: {
        totalPredictedPoints: Math.round(totalSquadPoints * 10) / 10,
        averageConfidence: Math.round(
          Array.from(squadPredictions.values()).reduce((s, p) => s + p.confidence, 0) / squadPredictions.size
        ),
      },
    });
  } catch (error) {
    console.error('Recommendations error:', error);
    res.status(503).json({ error: 'FPL servers busy - please retry', retryAfter: 5 });
  }
});

// Team fixtures with detailed hover data
app.get('/api/team-fixtures', async (req, res) => {
  try {
    const numWeeks = parseInt(req.query.weeks) || 6;
    await loadData();

    const bootstrap = await getBootstrap();
    const currentGW = bootstrap.events.find(gw => gw.is_current)?.id ?? 1;

    // Get top players per team
    const teamTopPlayers = new Map();
    for (const team of teamsById.values()) {
      const teamPlayers = bootstrap.elements
        .filter(p => p.team === team.id && (p.status === 'a' || p.status === 'd'))
        .sort((a, b) => b.total_points - a.total_points);

      const attackers = teamPlayers.filter(p => p.element_type === 3 || p.element_type === 4).slice(0, 3);
      const defenders = teamPlayers.filter(p => p.element_type === 1 || p.element_type === 2).slice(0, 2);

      teamTopPlayers.set(team.id, {
        starPlayers: teamPlayers.slice(0, 3).map(p => ({
          id: p.id,
          name: p.web_name,
          position: POSITION_MAP[p.element_type],
          points: p.total_points,
          form: p.form,
          photoCode: p.code,
        })),
        topAttackers: attackers.map(p => ({
          id: p.id,
          name: p.web_name,
          position: POSITION_MAP[p.element_type],
          goals: p.goals_scored,
          assists: p.assists,
          xG: parseFloat(p.expected_goals || 0).toFixed(1),
          xA: parseFloat(p.expected_assists || 0).toFixed(1),
          goalOdds: Math.round((parseFloat(p.expected_goals_per_90 || 0)) * 100),
          photoCode: p.code,
        })),
        topDefenders: defenders.map(p => ({
          id: p.id,
          name: p.web_name,
          position: POSITION_MAP[p.element_type],
          cleanSheets: p.clean_sheets,
          photoCode: p.code,
        })),
      });
    }

    const teams = Array.from(teamsById.values()).map(t => {
      const stats = teamStats.get(t.id) || {};
      const momentum = teamMomentum.get(t.id) ?? 0.5;
      
      return {
        id: t.id,
        name: t.name,
        shortName: t.short_name,
        badge: getTeamBadgeUrl(t),
        momentum: Math.round(momentum * 100),
        stats: {
          cleanSheetRate: stats.cleanSheetRate || 0,
          homeCleanSheetRate: stats.homeCleanSheetRate || 0,
          awayCleanSheetRate: stats.awayCleanSheetRate || 0,
          goalsPerGame: stats.goalsPerGame || 0,
          concededPerGame: stats.concededPerGame || 0,
          form: stats.form || 0,
          last5: stats.last5Results || '',
        },
        topPlayers: teamTopPlayers.get(t.id) || {},
      };
    });

    const fixtures = [];
    for (const f of fixturesData) {
      if (f.event === null || f.event < currentGW || f.event >= currentGW + numWeeks) continue;

      const homeTeam = teamsById.get(f.team_h);
      const awayTeam = teamsById.get(f.team_a);

      // Home fixture
      fixtures.push({
        id: f.id,
        teamId: f.team_h,
        gameweek: f.event,
        opponent: awayTeam?.short_name ?? 'UNK',
        opponentId: f.team_a,
        opponentBadge: getTeamBadgeUrl(awayTeam),
        isHome: true,
        difficulty: f.team_h_difficulty,
        csChance: calculateCleanSheetProbability(f.team_h, f.team_a, true),
      });

      // Away fixture
      fixtures.push({
        id: f.id,
        teamId: f.team_a,
        gameweek: f.event,
        opponent: homeTeam?.short_name ?? 'UNK',
        opponentId: f.team_h,
        opponentBadge: getTeamBadgeUrl(homeTeam),
        isHome: false,
        difficulty: f.team_a_difficulty,
        csChance: calculateCleanSheetProbability(f.team_a, f.team_h, false),
      });
    }

    res.json({ teams, fixtures, currentGameweek: currentGW });
  } catch (error) {
    console.error('Fixtures error:', error);
    res.status(500).json({ error: 'Failed to fetch fixtures' });
  }
});

// Live gameweek
app.get('/api/live/:gw', async (req, res) => {
  try {
    const gw = parseInt(req.params.gw);
    const liveData = await getLiveGameweek(gw);
    const bootstrap = await getBootstrap();

    const players = liveData.elements.map(e => {
      const player = bootstrap.elements.find(p => p.id === e.id);
      return {
        id: e.id,
        webName: player?.web_name ?? 'Unknown',
        teamId: player?.team,
        livePoints: e.stats.total_points,
        minutes: e.stats.minutes,
        goals: e.stats.goals_scored,
        assists: e.stats.assists,
        bonus: e.stats.bonus,
        bps: e.stats.bps,
      };
    });

    res.json({ gameweek: gw, players, lastUpdated: new Date().toISOString() });
  } catch (error) {
    console.error('Live error:', error);
    res.status(500).json({ error: 'Failed to fetch live data' });
  }
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Serve static files
app.use(express.static(path.join(__dirname, 'client', 'dist')));
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'client', 'dist', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`🚀 FPL Transfer Recommender v2 running on port ${PORT}`);
});
