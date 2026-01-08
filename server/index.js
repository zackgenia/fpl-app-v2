const express = require('express');
const cors = require('cors');
const path = require('path');
const { Cache } = require('./lib/cache');
const { loadUnderstatSnapshot } = require('./lib/snapshots/understat');
const { loadFbrefSnapshot } = require('./lib/snapshots/fbref');
const { matchUnderstatPlayer, matchUnderstatTeam } = require('./lib/mappings/understat');
const { createMockOddsProvider } = require('./lib/odds/mockProvider');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

const ENABLE_UNDERSTAT = process.env.ENABLE_UNDERSTAT === 'true';
const ENABLE_FBREF = process.env.ENABLE_FBREF === 'true';
const ENABLE_ODDS = process.env.ENABLE_ODDS === 'true';

// ===================
// CACHE SYSTEM
// ===================
const sharedCache = new Cache(300000);
const longCache = new Cache(1800000);
const metricsCache = new Cache(300000);

const FPL_TTL = {
  bootstrap: 300000,
  fixtures: 300000,
  elementSummary: 300000,
  live: 30000,
};

// ===================
// FPL API SERVICE
// ===================
const FPL_BASE_URL = 'https://fantasy.premierleague.com/api';

async function fetchFPL(endpoint, { ttlMs, retries = 3 } = {}) {
  const cached = sharedCache.get(endpoint);
  if (cached) return cached;

  let lastError;
  for (let i = 0; i < retries; i++) {
    try {
      const response = await fetch(`${FPL_BASE_URL}${endpoint}`, {
        headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) FPL-App/2.0' },
      });
      if (!response.ok) throw new Error(`FPL API error: ${response.status}`);
      const data = await response.json();
      sharedCache.set(endpoint, data, ttlMs);
      return data;
    } catch (err) {
      lastError = err;
      if (i < retries - 1) await new Promise(r => setTimeout(r, 1000 * (i + 1)));
    }
  }
  throw lastError;
}

async function getBootstrapRaw() {
  return fetchFPL('/bootstrap-static/', { ttlMs: FPL_TTL.bootstrap });
}

async function getFixturesRaw() {
  return fetchFPL('/fixtures/', { ttlMs: FPL_TTL.fixtures });
}

async function getPlayerSummaryRaw(playerId) {
  return fetchFPL(`/element-summary/${playerId}/`, { ttlMs: FPL_TTL.elementSummary });
}

async function getLiveGameweekRaw(gw) {
  return fetchFPL(`/event/${gw}/live/`, { ttlMs: FPL_TTL.live });
}

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
  const cacheKey = 'loaded_data_v3';
  if (longCache.get(cacheKey)) return;

  const bootstrap = await getBootstrapRaw();
  const fixtures = await getFixturesRaw();

  // Map teams by both ID and code
  teamsById = new Map(bootstrap.teams.map(t => [t.id, t]));
  teamsByCode = new Map(bootstrap.teams.map(t => [t.code, t]));
  fixturesData = fixtures;

  // Get finished fixtures for analysis
  const finished = fixtures
    .filter(f => f.finished && f.team_h_score !== null)
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
      gw: f.event,
    });
    teamResults.get(f.team_a).push({
      points: awayWin ? 3 : draw ? 1 : 0,
      scored: f.team_a_score,
      conceded: f.team_h_score,
      isHome: false,
      opponent: f.team_h,
      gw: f.event,
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

    const totalScored = last10.reduce((s, r) => s + r.scored, 0);
    const totalConceded = last10.reduce((s, r) => s + r.conceded, 0);
    const cleanSheets = last10.filter(r => r.conceded === 0).length;
    const homeCleanSheets = homeGames.filter(r => r.conceded === 0).length;
    const awayCleanSheets = awayGames.filter(r => r.conceded === 0).length;

    teamStats.set(team.id, {
      played: last10.length,
      cleanSheets,
      cleanSheetRate: last10.length > 0 ? cleanSheets / last10.length : 0,
      homeCleanSheetRate: homeGames.length > 0 ? homeCleanSheets / homeGames.length : 0,
      awayCleanSheetRate: awayGames.length > 0 ? awayCleanSheets / awayGames.length : 0,
      goalsPerGame: last10.length > 0 ? totalScored / last10.length : 0,
      concededPerGame: last10.length > 0 ? totalConceded / last10.length : 0,
      homeGoalsPerGame: homeGames.length > 0 ? homeGames.reduce((s, r) => s + r.scored, 0) / homeGames.length : 0,
      awayGoalsPerGame: awayGames.length > 0 ? awayGames.reduce((s, r) => s + r.scored, 0) / awayGames.length : 0,
      homeConcededPerGame: homeGames.length > 0 ? homeGames.reduce((s, r) => s + r.conceded, 0) / homeGames.length : 0,
      awayConcededPerGame: awayGames.length > 0 ? awayGames.reduce((s, r) => s + r.conceded, 0) / awayGames.length : 0,
      form: last5.reduce((s, r) => s + r.points, 0), // Out of 15
      last5Results: last5.map(r => (r.points === 3 ? 'W' : r.points === 1 ? 'D' : 'L')).join(''),
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
    case 1:
      return 1 + (0.30 * factor);
    case 2:
      return 1 + (0.12 * factor);
    case 3:
      return 1.0;
    case 4:
      return 1 - (0.10 * factor);
    case 5:
      return 1 - (0.20 * factor);
    default:
      return 1.0;
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
  const summary = await getPlayerSummaryRaw(player.id);
  const history = summary.history;
  const upcoming = summary.fixtures.slice(0, horizon);
  const position = POSITION_MAP[player.element_type];
  const pts = POINTS_SYSTEM[position];

  // Minutes calculation
  const recentHistory = history.slice(-5);
  const avgMinutes = recentHistory.length > 0
    ? recentHistory.reduce((s, h) => s + h.minutes, 0) / recentHistory.length
    : 45;
  const availability = player.chance_of_playing_next_round ?? 100;
  const minutesProb = Math.min(avgMinutes / 90, 1) * (availability / 100);

  // Base form score
  const baseScore = recentHistory.length > 0
    ? recentHistory.reduce((s, h) => s + h.total_points, 0) / recentHistory.length
    : 2;

  // Form trend
  const formTrend = calculateFormTrend(history);
  const formMult = formTrend === 'rising' ? 1.08 : formTrend === 'falling' ? 0.92 : 1.0;

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
    const assistProb = (player.expected_assists_per_90 || 0)
      * (fix.is_home ? 1.1 : 0.9)
      * (teamStats.get(oppId)?.awayConcededPerGame > 1.5 ? 1.2 : 1);

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

  // Confidence calculation
  const confidenceFactors = [];
  let confidenceScore = 0;

  // Minutes component (0-35)
  confidenceScore += Math.min(avgMinutes / 90, 1) * 35;
  if (avgMinutes < 60) confidenceFactors.push({ text: 'Rotation risk', type: 'warning' });

  // Sample size (0-25)
  confidenceScore += Math.min(history.length / 15, 1) * 25;
  if (history.length < 5) confidenceFactors.push({ text: 'Limited match data', type: 'warning' });

  // Availability (0-20)
  confidenceScore += (availability / 100) * 20;
  if (availability < 100) confidenceFactors.push({ text: `${availability}% chance of playing`, type: availability < 75 ? 'danger' : 'warning' });

  // Form (0-20)
  confidenceScore += formTrend === 'stable' ? 20 : formTrend === 'rising' ? 18 : 8;
  if (formTrend === 'falling') confidenceFactors.push({ text: 'Form declining', type: 'danger' });
  if (formTrend === 'rising') confidenceFactors.push({ text: 'Form improving', type: 'positive' });

  // Team form
  if (momentum > 0.65) confidenceFactors.push({ text: 'Team in good form', type: 'positive' });
  if (momentum < 0.35) confidenceFactors.push({ text: 'Team struggling', type: 'warning' });

  if (player.news) confidenceFactors.push({ text: player.news.substring(0, 60), type: 'info' });

  const confidence = Math.round(Math.min(100, confidenceScore));

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
// METRICS BUILDERS
// ===================
async function buildPlayerMetrics(playerId) {
  const cacheKey = `playerMetrics:${playerId}`;
  const cached = metricsCache.get(cacheKey);
  if (cached) return cached;

  const bootstrap = await getBootstrapRaw();
  const player = bootstrap.elements.find(p => p.id === playerId);
  if (!player) return null;

  await loadData();
  const summary = await getPlayerSummaryRaw(playerId);
  const understatSnapshot = ENABLE_UNDERSTAT ? await loadUnderstatSnapshot() : null;
  const fbrefSnapshot = ENABLE_FBREF ? await loadFbrefSnapshot() : null;
  const history = summary.history ?? [];
  const recentHistory = history.slice(-5);

  const minutesLast5 = recentHistory.length > 0
    ? Math.round(recentHistory.reduce((s, h) => s + h.minutes, 0) / recentHistory.length)
    : 0;
  const minutesTrend = recentHistory.length >= 4
    ? Math.round(
      (recentHistory.slice(-2).reduce((s, h) => s + h.minutes, 0) / 2)
      - (recentHistory.slice(0, 2).reduce((s, h) => s + h.minutes, 0) / 2)
    )
    : 0;

  const team = teamsById.get(player.team);

  const nextFixtures = summary.fixtures.slice(0, 5).map(fix => {
    const oppId = fix.is_home ? fix.team_a : fix.team_h;
    const opp = teamsById.get(oppId);
    return {
      fixtureId: fix.id,
      opponent: opp?.short_name ?? 'UNK',
      opponentId: oppId,
      isHome: fix.is_home,
      difficulty: fix.difficulty,
      kickoff: fix.kickoff_time,
    };
  });

  let advanced = null;

  if (understatSnapshot) {
    const understatPlayer = matchUnderstatPlayer(player, team, understatSnapshot.players);
    const understatTeam = matchUnderstatTeam(team, understatSnapshot.teams);

    if (understatPlayer || understatTeam) {
      advanced = {
        xG: understatPlayer?.xG ?? null,
        xA: understatPlayer?.xA ?? null,
        xGI: understatPlayer?.xGI ?? null,
        shots: understatPlayer?.shots ?? null,
        bigChances: null,
        teamXG: understatTeam?.xG ?? null,
        oppXGA: null,
      };
    }
  } else if (fbrefSnapshot) {
    advanced = null;
  }

  const metrics = {
    identity: {
      id: player.id,
      name: player.web_name,
      teamId: player.team,
      teamName: team?.name ?? 'Unknown',
      position: POSITION_MAP[player.element_type],
    },
    fantasy: {
      price: player.now_cost,
      ownership: parseFloat(player.selected_by_percent || 0),
      form: parseFloat(player.form || 0),
      points: player.total_points,
      minutes: player.minutes,
      transfersTrend: (player.transfers_in_event ?? 0) - (player.transfers_out_event ?? 0),
      ictIndex: parseFloat(player.ict_index || 0),
      bps: player.bps ?? null,
      bonus: player.bonus ?? null,
    },
    role: {
      starts: history.filter(h => h.minutes > 0).length,
      minutesLast5,
      minutesTrend,
    },
    fixtures: {
      nextFixtures,
    },
    advanced,
    derived: {
      expectedPointsNext: null,
      expectedGoalsNext: null,
      expectedCleanSheetProb: null,
    },
  };

  metricsCache.set(cacheKey, metrics);
  return metrics;
}

async function buildTeamMetrics(teamId) {
  const cacheKey = `teamMetrics:${teamId}`;
  const cached = metricsCache.get(cacheKey);
  if (cached) return cached;

  await loadData();
  const bootstrap = await getBootstrapRaw();
  const team = bootstrap.teams.find(t => t.id === teamId);
  if (!team) return null;

  const understatSnapshot = ENABLE_UNDERSTAT ? await loadUnderstatSnapshot() : null;
  const fbrefSnapshot = ENABLE_FBREF ? await loadFbrefSnapshot() : null;

  const currentGW = bootstrap.events.find(gw => gw.is_current)?.id ?? 1;
  const upcomingFixtures = fixturesData
    .filter(f => f.event !== null && f.event >= currentGW && f.event < currentGW + 5)
    .filter(f => f.team_h === teamId || f.team_a === teamId)
    .map(f => {
      const isHome = f.team_h === teamId;
      const oppId = isHome ? f.team_a : f.team_h;
      const opp = teamsById.get(oppId);
      return {
        fixtureId: f.id,
        opponent: opp?.short_name ?? 'UNK',
        opponentId: oppId,
        isHome,
        difficulty: isHome ? f.team_h_difficulty : f.team_a_difficulty,
        kickoff: f.kickoff_time,
      };
    });

  const fdrAverage = upcomingFixtures.length > 0
    ? upcomingFixtures.reduce((s, f) => s + f.difficulty, 0) / upcomingFixtures.length
    : 0;

  const stats = teamStats.get(teamId) || {};
  const strength = teamStrength.get(teamId) || {};

  let advanced = null;
  if (understatSnapshot) {
    const understatTeam = matchUnderstatTeam(team, understatSnapshot.teams);
    if (understatTeam) {
      advanced = {
        xGFor: understatTeam.xG ?? null,
        xGAgainst: understatTeam.xGA ?? null,
        homeXGFor: null,
        awayXGFor: null,
        homeXGAgainst: null,
        awayXGAgainst: null,
      };
    }
  } else if (fbrefSnapshot) {
    advanced = null;
  }

  const metrics = {
    basic: {
      id: team.id,
      name: team.name,
      shortName: team.short_name,
      badge: getTeamBadgeUrl(team),
    },
    fantasy: {
      fdrAverage: Math.round(fdrAverage * 10) / 10,
      upcomingFixtures,
    },
    advanced,
    derived: {
      attackStrength: strength.homeAttack ?? null,
      defenceStrength: strength.homeDefence ?? null,
      cleanSheetRateProxy: stats.cleanSheetRate ?? null,
    },
  };

  metricsCache.set(cacheKey, metrics);
  return metrics;
}

async function buildFixtureContext(fixtureId) {
  const cacheKey = `fixtureContext:${fixtureId}`;
  const cached = metricsCache.get(cacheKey);
  if (cached) return cached;

  await loadData();
  const bootstrap = await getBootstrapRaw();
  const fixture = fixturesData.find(f => f.id === fixtureId);
  if (!fixture) return null;

  const oddsProvider = ENABLE_ODDS ? createMockOddsProvider({ teamStats, teamStrength }) : null;
  const homeTeam = teamsById.get(fixture.team_h);
  const awayTeam = teamsById.get(fixture.team_a);
  const impliedGoals = oddsProvider ? oddsProvider.getImpliedGoals(fixture) : null;
  const homeCS = oddsProvider
    ? oddsProvider.getCleanSheetProb(fixture.team_h, fixture.team_a, true)
    : calculateCleanSheetProbability(fixture.team_h, fixture.team_a, true);
  const awayCS = oddsProvider
    ? oddsProvider.getCleanSheetProb(fixture.team_a, fixture.team_h, false)
    : calculateCleanSheetProbability(fixture.team_a, fixture.team_h, false);

  const topPlayers = (teamId) => {
    const players = bootstrap.elements
      .filter(p => p.team === teamId)
      .sort((a, b) => parseFloat(b.selected_by_percent || 0) - parseFloat(a.selected_by_percent || 0))
      .slice(0, 3);

    return players.map(p => ({
      id: p.id,
      name: p.web_name,
      position: POSITION_MAP[p.element_type],
      ownership: parseFloat(p.selected_by_percent || 0),
    }));
  };

  const context = {
    id: fixture.id,
    kickoff: fixture.kickoff_time,
    teams: {
      homeId: fixture.team_h,
      awayId: fixture.team_a,
      homeName: homeTeam?.short_name ?? 'UNK',
      awayName: awayTeam?.short_name ?? 'UNK',
    },
    difficulty: {
      home: fixture.team_h_difficulty,
      away: fixture.team_a_difficulty,
    },
    impliedGoals,
    cleanSheetProb: {
      homeCS,
      awayCS,
    },
    expectedCleanSheetPoints: {
      home: Math.round((homeCS / 100) * 4 * 10) / 10,
      away: Math.round((awayCS / 100) * 4 * 10) / 10,
    },
    keyPlayers: {
      home: topPlayers(fixture.team_h),
      away: topPlayers(fixture.team_a),
    },
  };

  metricsCache.set(cacheKey, context);
  return context;
}

// ===================
// API ROUTES
// ===================

// FPL proxy endpoints (raw)
app.get('/api/fpl/bootstrap', async (req, res) => {
  try {
    const data = await getBootstrapRaw();
    res.json(data);
  } catch (error) {
    console.error('FPL bootstrap proxy error:', error);
    res.status(503).json({ error: 'FPL servers busy', retryAfter: 5 });
  }
});

app.get('/api/fpl/fixtures', async (req, res) => {
  try {
    const data = await getFixturesRaw();
    res.json(data);
  } catch (error) {
    console.error('FPL fixtures proxy error:', error);
    res.status(503).json({ error: 'FPL servers busy', retryAfter: 5 });
  }
});

app.get('/api/fpl/event/:gw/live', async (req, res) => {
  try {
    const gw = parseInt(req.params.gw);
    const data = await getLiveGameweekRaw(gw);
    res.json(data);
  } catch (error) {
    console.error('FPL live proxy error:', error);
    res.status(503).json({ error: 'FPL servers busy', retryAfter: 5 });
  }
});

app.get('/api/fpl/element/:id/summary', async (req, res) => {
  try {
    const playerId = parseInt(req.params.id);
    const data = await getPlayerSummaryRaw(playerId);
    res.json(data);
  } catch (error) {
    console.error('FPL element summary proxy error:', error);
    res.status(503).json({ error: 'FPL servers busy', retryAfter: 5 });
  }
});

// Metrics (normalized)
app.get('/api/metrics/player/:id', async (req, res) => {
  try {
    const playerId = parseInt(req.params.id);
    const metrics = await buildPlayerMetrics(playerId);
    if (!metrics) return res.status(404).json({ error: 'Player not found' });
    res.json(metrics);
  } catch (error) {
    console.error('Player metrics error:', error);
    res.status(500).json({ error: 'Failed to build player metrics' });
  }
});

app.get('/api/metrics/team/:id', async (req, res) => {
  try {
    const teamId = parseInt(req.params.id);
    const metrics = await buildTeamMetrics(teamId);
    if (!metrics) return res.status(404).json({ error: 'Team not found' });
    res.json(metrics);
  } catch (error) {
    console.error('Team metrics error:', error);
    res.status(500).json({ error: 'Failed to build team metrics' });
  }
});

app.get('/api/metrics/fixture/:id', async (req, res) => {
  try {
    const fixtureId = parseInt(req.params.id);
    const context = await buildFixtureContext(fixtureId);
    if (!context) return res.status(404).json({ error: 'Fixture not found' });
    res.json(context);
  } catch (error) {
    console.error('Fixture metrics error:', error);
    res.status(500).json({ error: 'Failed to build fixture context' });
  }
});

// Bootstrap
app.get('/api/bootstrap', async (req, res) => {
  try {
    const data = await getBootstrapRaw();
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

    const bootstrap = await getBootstrapRaw();
    const player = bootstrap.elements.find(p => p.id === playerId);
    if (!player) return res.status(404).json({ error: 'Player not found' });

    await loadData();
    const summary = await getPlayerSummaryRaw(playerId);
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

// Recommendations
app.post('/api/recommendations', async (req, res) => {
  try {
    const { squad, bank, horizon = 5, includeInjured = false, strategy = 'maxPoints' } = req.body;
    if (!squad || !Array.isArray(squad)) {
      return res.status(400).json({ error: 'Invalid squad' });
    }

    const bootstrap = await getBootstrapRaw();
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

    const bootstrap = await getBootstrapRaw();
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
    const liveData = await getLiveGameweekRaw(gw);
    const bootstrap = await getBootstrapRaw();

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
app.use(express.static(path.join(__dirname, '..', 'client', 'dist')));
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'client', 'dist', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`🚀 FPL Transfer Recommender v2 running on port ${PORT}`);
});
