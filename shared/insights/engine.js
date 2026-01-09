const POSITION_POINTS = {
  GK: { goal: 6, assist: 3, cleanSheet: 4, appearance60: 2, appearance1: 1 },
  DEF: { goal: 6, assist: 3, cleanSheet: 4, appearance60: 2, appearance1: 1 },
  MID: { goal: 5, assist: 3, cleanSheet: 1, appearance60: 2, appearance1: 1 },
  FWD: { goal: 4, assist: 3, cleanSheet: 0, appearance60: 2, appearance1: 1 },
};

const FIXTURE_WEIGHTS = [1, 0.95, 0.9, 0.85, 0.8];
const HOME_ADVANTAGE = 1.12;
const AWAY_PENALTY = 0.88;

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function poissonCleanSheetProbability(opponentImpliedGoals) {
  const prob = Math.exp(-opponentImpliedGoals);
  return clamp(prob, 0.05, 0.65);
}

function buildTeamStrength({ teams, teamStats, understatTeams }) {
  const teamValues = teams.map(team => {
    const stats = teamStats.get(team.id) || {};
    const understat = understatTeams?.get(team.id) || null;
    const xGPerGame = understat?.xGPerGame ?? stats.goalsPerGame ?? 1.2;
    const xGAPerGame = understat?.xGAPerGame ?? stats.concededPerGame ?? 1.2;

    return {
      id: team.id,
      xGPerGame: Number.isFinite(xGPerGame) ? xGPerGame : 1.2,
      xGAPerGame: Number.isFinite(xGAPerGame) ? xGAPerGame : 1.2,
      source: understat ? 'understat' : 'fpl',
    };
  });

  const avgXG = teamValues.reduce((sum, t) => sum + t.xGPerGame, 0) / Math.max(teamValues.length, 1);
  const avgXGA = teamValues.reduce((sum, t) => sum + t.xGAPerGame, 0) / Math.max(teamValues.length, 1);

  const strengthMap = new Map();
  for (const team of teamValues) {
    const attackIndex = clamp(team.xGPerGame / (avgXG || 1), 0.6, 1.6);
    const defenceIndex = clamp((avgXGA || 1) / team.xGAPerGame, 0.6, 1.6);
    strengthMap.set(team.id, {
      attackIndex,
      defenceIndex,
      xGPerGame: team.xGPerGame,
      xGAPerGame: team.xGAPerGame,
      source: team.source,
    });
  }

  return { strengthMap, avgGoalsPerGame: avgXG || 1.3 };
}

function computeImpliedGoals({
  homeTeamId,
  awayTeamId,
  strengthMap,
  avgGoalsPerGame,
  odds,
}) {
  const homeStrength = strengthMap.get(homeTeamId);
  const awayStrength = strengthMap.get(awayTeamId);
  const baseGoals = avgGoalsPerGame || 1.3;

  if (odds?.homeXG && odds?.awayXG) {
    return {
      homeXG: clamp(odds.homeXG, 0.2, 3.5),
      awayXG: clamp(odds.awayXG, 0.2, 3.5),
      estimated: odds.isEstimated ?? false,
    };
  }

  const homeAttack = homeStrength?.attackIndex ?? 1;
  const awayAttack = awayStrength?.attackIndex ?? 1;
  const homeDefence = homeStrength?.defenceIndex ?? 1;
  const awayDefence = awayStrength?.defenceIndex ?? 1;

  const homeXG = clamp(baseGoals * homeAttack * (1 / awayDefence) * HOME_ADVANTAGE, 0.2, 3.5);
  const awayXG = clamp(baseGoals * awayAttack * (1 / homeDefence) * AWAY_PENALTY, 0.2, 3.5);

  return { homeXG, awayXG, estimated: true };
}

function projectFixture({ fixture, teams, strengthMap, avgGoalsPerGame, oddsMap }) {
  const odds = oddsMap?.get(fixture.id) || null;
  const implied = computeImpliedGoals({
    homeTeamId: fixture.homeTeamId,
    awayTeamId: fixture.awayTeamId,
    strengthMap,
    avgGoalsPerGame,
    odds,
  });

  const homeCS = poissonCleanSheetProbability(implied.awayXG);
  const awayCS = poissonCleanSheetProbability(implied.homeXG);

  const homeTeam = teams.get(fixture.homeTeamId);
  const awayTeam = teams.get(fixture.awayTeamId);

  return {
    fixtureId: fixture.id,
    homeTeamId: fixture.homeTeamId,
    awayTeamId: fixture.awayTeamId,
    homeTeamName: homeTeam?.short_name ?? 'HOME',
    awayTeamName: awayTeam?.short_name ?? 'AWAY',
    homeXG: implied.homeXG,
    awayXG: implied.awayXG,
    homeCS: homeCS * 100,
    awayCS: awayCS * 100,
    estimated: implied.estimated,
  };
}

// ============================================
// IMPROVED: Smart minutes calculation
// Handles returning players and injury gaps
// ============================================
function calculateExpectedMinutes(history, availability, player) {
  if (!history || history.length === 0) {
    // New player or no data - use reasonable default based on availability
    const base = availability >= 75 ? 70 : availability >= 50 ? 45 : 20;
    return { expectedMinutes: base, roleFactor: 0.85, avgMinutes: base, isReturning: false };
  }

  // Sort history by round (most recent first)
  const sortedHistory = [...history].sort((a, b) => (b.round ?? 0) - (a.round ?? 0));

  // Detect returning player: recent games with 0 mins followed by games with minutes
  const recentGames = sortedHistory.slice(0, 5);
  const gamesWithMinutes = recentGames.filter(h => (h.minutes ?? 0) > 0);
  const gamesWithZero = recentGames.filter(h => (h.minutes ?? 0) === 0);

  // Check if player is returning from absence
  const isReturning = gamesWithZero.length >= 2 && gamesWithMinutes.length >= 1 &&
                      gamesWithMinutes.some(h => (h.minutes ?? 0) >= 60);

  // For returning players, look at their performance BEFORE the absence
  let relevantHistory;
  if (isReturning) {
    // Find games where they played significant minutes
    const fittGames = sortedHistory.filter(h => (h.minutes ?? 0) >= 45);
    relevantHistory = fittGames.slice(0, 10); // Use last 10 games where they were fit
  } else {
    // Normal calculation - last 8 games with diminishing weight
    relevantHistory = sortedHistory.slice(0, 8);
  }

  if (relevantHistory.length === 0) {
    return { expectedMinutes: 60, roleFactor: 0.85, avgMinutes: 60, isReturning };
  }

  // Weighted average - more recent games get slightly more weight
  let totalWeight = 0;
  let weightedMinutes = 0;
  relevantHistory.forEach((h, idx) => {
    const weight = 1 - (idx * 0.05); // 1.0, 0.95, 0.90, etc.
    weightedMinutes += (h.minutes ?? 0) * weight;
    totalWeight += weight;
  });

  const avgMinutes = totalWeight > 0 ? weightedMinutes / totalWeight : 60;

  // Role factor based on typical minutes
  let roleFactor = 0.9;
  if (avgMinutes >= 85) roleFactor = 1.0;
  else if (avgMinutes >= 75) roleFactor = 0.95;
  else if (avgMinutes >= 60) roleFactor = 0.9;
  else if (avgMinutes >= 45) roleFactor = 0.8;
  else roleFactor = 0.7;

  // Availability adjustment
  const availabilityFactor = availability !== null && availability !== undefined
    ? Math.pow(availability / 100, 0.5)  // Square root - less harsh penalty
    : 0.95;

  // For returning players, be more optimistic about minutes
  const returningBoost = isReturning ? 1.1 : 1.0;

  const expectedMinutes = clamp(avgMinutes * roleFactor * availabilityFactor * returningBoost, 0, 90);

  return { expectedMinutes, roleFactor, avgMinutes, isReturning };
}

// ============================================
// IMPROVED: Season baseline calculation
// Uses points per game as anchor with form modifier
// ============================================
function calculateSeasonBaseline(player, history) {
  const totalPoints = player.total_points ?? player.totalPoints ?? 0;
  const totalMinutes = player.minutes ?? 0;

  // Points per 90 minutes (season average)
  const pp90 = totalMinutes > 0 ? (totalPoints / totalMinutes) * 90 : 0;

  // Points per game (for players who get rotated)
  const gamesPlayed = history?.filter(h => (h.minutes ?? 0) > 0).length || 0;
  const ppg = gamesPlayed > 0 ? totalPoints / gamesPlayed : 0;

  // Recent form (last 5 games where they played)
  const recentGames = (history || [])
    .filter(h => (h.minutes ?? 0) > 0)
    .sort((a, b) => (b.round ?? 0) - (a.round ?? 0))
    .slice(0, 5);

  const recentPP90 = recentGames.length > 0
    ? recentGames.reduce((sum, h) => sum + (h.total_points ?? 0), 0) /
      Math.max(recentGames.reduce((sum, h) => sum + (h.minutes ?? 0), 0) / 90, 0.5)
    : pp90;

  // Form trend: compare recent to season average
  const formRatio = pp90 > 0 ? recentPP90 / pp90 : 1;
  const formMultiplier = clamp(0.85 + (formRatio - 1) * 0.15, 0.85, 1.2);

  return {
    pp90,
    ppg,
    recentPP90,
    formMultiplier,
    gamesPlayed,
    totalMinutes,
    totalPoints,
  };
}

// ============================================
// IMPROVED: Historical H2H performance
// ============================================
function getHistoricalPerformanceVsOpponent(history, opponentId) {
  if (!history || history.length === 0) return null;

  // Find games against this opponent
  const vsOpponent = history.filter(h => h.opponent_team === opponentId);

  if (vsOpponent.length === 0) return null;

  const totalPoints = vsOpponent.reduce((sum, h) => sum + (h.total_points ?? 0), 0);
  const totalMinutes = vsOpponent.reduce((sum, h) => sum + (h.minutes ?? 0), 0);
  const gamesPlayed = vsOpponent.filter(h => (h.minutes ?? 0) > 0).length;

  if (gamesPlayed === 0) return null;

  return {
    avgPoints: totalPoints / gamesPlayed,
    pp90: totalMinutes > 0 ? (totalPoints / totalMinutes) * 90 : 0,
    gamesPlayed,
    totalMinutes,
    // Boost factor based on historical performance
    h2hMultiplier: gamesPlayed >= 2 ? 1.0 : 0.5, // Weight H2H data by sample size
  };
}

// ============================================
// IMPROVED: Attacking outputs with season context
// ============================================
function computeAttackingOutputs({
  player,
  expectedMinutes,
  opponentDefenceIndex,
  fixtureDifficulty,
  understatPlayer,
  seasonBaseline,
  h2hData,
  isHome,
}) {
  const opponentAdjustment = clamp(1 / (opponentDefenceIndex || 1), 0.75, 1.35);
  const minutesFactor = expectedMinutes / 90;
  const homeAwayMod = isHome ? 1.08 : 0.92;

  let xGI90 = 0;
  let xG = 0;
  let xA = 0;
  let isEstimated = false;

  // Priority: Understat > FPL expected stats > ICT fallback
  if (understatPlayer && understatPlayer.minutes > 0) {
    xG = understatPlayer.xG;
    xA = understatPlayer.xA;
    xGI90 = ((xG + xA) / understatPlayer.minutes) * 90;
  } else if (player.expected_goal_involvements && player.minutes > 0) {
    xG = parseFloat(player.expected_goals || 0);
    xA = parseFloat(player.expected_assists || 0);
    xGI90 = ((xG + xA) / player.minutes) * 90;
    isEstimated = true;
  } else {
    // Fallback: derive from ICT and form
    const ict = parseFloat(player.ict_index || 0);
    const form = parseFloat(player.form || 0);
    const base = clamp((ict + form * 2) / 12, 0.1, 1.5);
    xGI90 = base;
    isEstimated = true;
  }

  // Fixture difficulty multiplier (position-aware)
  const position = player.position ?? player.element_type;
  const positionFactor = position === 4 ? 1.0 : position === 3 ? 0.9 : 0.8;
  const difficultyMultiplier = clamp(1.2 - (fixtureDifficulty - 1) * 0.1 * positionFactor, 0.75, 1.25);

  // Historical H2H boost (capped)
  const h2hBoost = h2hData?.h2hMultiplier
    ? clamp(1 + (h2hData.pp90 / Math.max(seasonBaseline?.pp90 || 4, 4) - 1) * 0.15 * h2hData.h2hMultiplier, 0.9, 1.15)
    : 1.0;

  // Form multiplier from season baseline
  const formMult = seasonBaseline?.formMultiplier ?? 1.0;

  const expectedGI = xGI90 * minutesFactor * opponentAdjustment * difficultyMultiplier * homeAwayMod * h2hBoost * formMult;
  const xGShare = xG + xA > 0 ? xG / (xG + xA) : 0.55;

  return {
    expectedGI,
    expectedGoals: expectedGI * xGShare,
    expectedAssists: expectedGI * (1 - xGShare),
    xG,
    xA,
    xGI90,
    isEstimated,
    h2hBoost,
    formMult,
  };
}

// ============================================
// IMPROVED: Points mapping with better baseline
// ============================================
function mapExpectedPoints({
  position,
  expectedMinutes,
  expectedGoals,
  expectedAssists,
  cleanSheetProb,
  bonusExpectation,
  seasonBaseline,
}) {
  const points = POSITION_POINTS[position] ?? POSITION_POINTS.MID;
  const minutesFactor = clamp(expectedMinutes / 90, 0, 1);

  // Appearance points: 1pt for 1-59 mins, 2pts for 60+
  const under60Prob = clamp(1 - (expectedMinutes / 60), 0, 1);
  const over60Prob = clamp((expectedMinutes - 30) / 60, 0, 1);
  const appearancePoints = (under60Prob * points.appearance1) + (over60Prob * points.appearance60);

  const goalPoints = expectedGoals * points.goal;
  const assistPoints = expectedAssists * points.assist;
  const cleanSheetPoints = cleanSheetProb * points.cleanSheet * clamp(expectedMinutes / 60, 0, 1);

  // Bonus: based on ICT with historical context
  const bonusPoints = bonusExpectation * 0.8; // Slight discount

  // Calculate base total
  let total = appearancePoints + goalPoints + assistPoints + cleanSheetPoints + bonusPoints;

  // Anchor to season baseline if available (prevents extreme predictions)
  if (seasonBaseline?.ppg > 0 && minutesFactor > 0.5) {
    const rawPrediction = total;
    const baselineAnchor = seasonBaseline.ppg * 0.3; // 30% weight to baseline
    const predictionWeight = 0.7; // 70% weight to calculated prediction
    total = (rawPrediction * predictionWeight) + (baselineAnchor);

    // Clamp to reasonable range based on position
    const positionCap = position === 'GK' ? 8 : position === 'DEF' ? 10 : position === 'MID' ? 12 : 10;
    total = clamp(total, 1, positionCap);
  }

  return {
    appearancePoints,
    goalPoints,
    assistPoints,
    cleanSheetPoints,
    bonusPoints,
    total,
  };
}

// ============================================
// MAIN: Project player with all improvements
// ============================================
function projectPlayer({
  player,
  fixtures,
  strengthMap,
  avgGoalsPerGame,
  understatPlayers,
  oddsMap,
}) {
  const positionMap = { 1: 'GK', 2: 'DEF', 3: 'MID', 4: 'FWD' };
  const position = typeof player.position === 'string'
    ? player.position
    : positionMap[player.element_type ?? player.position] ?? 'MID';

  const availability = player.chance_of_playing_next_round ?? player.chanceOfPlaying ?? 90;
  const history = player.history || [];

  // Calculate season baseline
  const seasonBaseline = calculateSeasonBaseline(player, history);

  // Calculate expected minutes with returning player detection
  const { expectedMinutes, isReturning, avgMinutes } = calculateExpectedMinutes(history, availability, player);

  const fixtureProjections = fixtures.map((fixture, index) => {
    const opponentStrength = strengthMap.get(fixture.opponentId);
    const opponentDefenceIndex = opponentStrength?.defenceIndex ?? 1;
    const understatPlayer = understatPlayers?.get(player.id) || null;

    // Get historical H2H data
    const h2hData = getHistoricalPerformanceVsOpponent(history, fixture.opponentId);

    const attacking = computeAttackingOutputs({
      player,
      expectedMinutes,
      opponentDefenceIndex,
      fixtureDifficulty: fixture.difficulty,
      understatPlayer,
      seasonBaseline,
      h2hData,
      isHome: fixture.isHome,
    });

    const fixtureProjection = projectFixture({
      fixture: {
        id: fixture.fixtureId,
        homeTeamId: fixture.isHome ? player.team : fixture.opponentId,
        awayTeamId: fixture.isHome ? fixture.opponentId : player.team,
      },
      teams: new Map(),
      strengthMap,
      avgGoalsPerGame,
      oddsMap,
    });

    // Clean sheet probability (DEF/GK get full, MID gets reduced)
    let cleanSheetProb = 0;
    if (position === 'GK' || position === 'DEF') {
      cleanSheetProb = (fixture.isHome ? fixtureProjection.homeCS : fixtureProjection.awayCS) / 100;
    } else if (position === 'MID') {
      cleanSheetProb = ((fixture.isHome ? fixtureProjection.homeCS : fixtureProjection.awayCS) / 100) * 0.25; // MID clean sheet is only 1pt
    }

    // Bonus expectation from ICT
    const bonusExpectation = clamp(parseFloat(player.ict_index || 0) / 18, 0, 1.2);

    const pointsBreakdown = mapExpectedPoints({
      position,
      expectedMinutes,
      expectedGoals: attacking.expectedGoals,
      expectedAssists: attacking.expectedAssists,
      cleanSheetProb,
      bonusExpectation,
      seasonBaseline,
    });

    return {
      fixtureId: fixture.fixtureId,
      gameweek: fixture.gameweek,
      opponent: fixture.opponent,
      opponentId: fixture.opponentId,
      opponentBadge: fixture.opponentBadge,
      isHome: fixture.isHome,
      difficulty: fixture.difficulty,
      expectedPoints: pointsBreakdown.total,
      breakdown: pointsBreakdown,
      xG: attacking.expectedGoals,
      xA: attacking.expectedAssists,
      xGI: attacking.expectedGI,
      xGI90: attacking.xGI90,
      shots: understatPlayer?.shots ?? null,
      bigChances: understatPlayer?.bigChances ?? null,
      isEstimated: attacking.isEstimated || fixtureProjection.estimated,
      weight: FIXTURE_WEIGHTS[index] ?? 0.8,
      h2hBoost: attacking.h2hBoost,
    };
  });

  // Calculate aggregate xPts
  const next5 = fixtureProjections.slice(0, 5).reduce((sum, f) => sum + f.expectedPoints * f.weight, 0);
  const next3 = fixtureProjections.slice(0, 3).reduce((sum, f) => sum + f.expectedPoints * f.weight, 0);
  const nextFixture = fixtureProjections[0]?.expectedPoints ?? 0;

  // Confidence intervals based on variance in player's history
  const pointsVariance = calculatePointsVariance(history);
  const varianceFactor = clamp(pointsVariance / 3, 0.1, 0.3);
  const low = next5 * (1 - varianceFactor);
  const high = next5 * (1 + varianceFactor);

  const baseBreakdown = fixtureProjections[0]?.breakdown ?? mapExpectedPoints({
    position,
    expectedMinutes,
    expectedGoals: 0,
    expectedAssists: 0,
    cleanSheetProb: 0,
    bonusExpectation: 0,
    seasonBaseline,
  });

  const advanced = fixtureProjections[0]
    ? {
        xG: fixtureProjections[0].xG,
        xA: fixtureProjections[0].xA,
        xGI: fixtureProjections[0].xGI,
        xGI90: fixtureProjections[0].xGI90,
        shots: fixtureProjections[0].shots,
        bigChances: fixtureProjections[0].bigChances,
      }
    : { xG: 0, xA: 0, xGI: 0, xGI90: 0, shots: null, bigChances: null };

  return {
    playerId: player.id,
    position,
    teamId: player.team,
    xPts: {
      nextFixture,
      next3,
      next5,
      low,
      high,
    },
    breakdown: {
      appearance: baseBreakdown.appearancePoints,
      goals: baseBreakdown.goalPoints,
      assists: baseBreakdown.assistPoints,
      cleanSheet: baseBreakdown.cleanSheetPoints,
      bonus: baseBreakdown.bonusPoints,
    },
    fixtures: fixtureProjections.map(f => ({
      fixtureId: f.fixtureId,
      gameweek: f.gameweek,
      opponent: f.opponent,
      opponentId: f.opponentId,
      opponentBadge: f.opponentBadge,
      isHome: f.isHome,
      difficulty: f.difficulty,
      expectedPoints: f.expectedPoints,
    })),
    advanced,
    estimated: fixtureProjections.some(f => f.isEstimated),
    seasonBaseline: {
      ppg: seasonBaseline.ppg,
      pp90: seasonBaseline.pp90,
      gamesPlayed: seasonBaseline.gamesPlayed,
    },
    isReturning,
  };
}

// Calculate historical points variance for confidence bands
function calculatePointsVariance(history) {
  if (!history || history.length < 3) return 2.5; // Default moderate variance

  const recentGames = history
    .filter(h => (h.minutes ?? 0) > 30)
    .slice(0, 10);

  if (recentGames.length < 3) return 2.5;

  const points = recentGames.map(h => h.total_points ?? 0);
  const mean = points.reduce((a, b) => a + b, 0) / points.length;
  const variance = points.reduce((sum, p) => sum + Math.pow(p - mean, 2), 0) / points.length;
  const stdDev = Math.sqrt(variance);

  return stdDev;
}

function projectTeam({ teamId, fixtures, strengthMap, avgGoalsPerGame, oddsMap }) {
  const teamStrength = strengthMap.get(teamId);
  const attackIndex = teamStrength?.attackIndex ?? 1;
  const defenceIndex = teamStrength?.defenceIndex ?? 1;

  const outlook = fixtures.map(fixture => {
    const projection = projectFixture({
      fixture: {
        id: fixture.fixtureId,
        homeTeamId: fixture.isHome ? teamId : fixture.opponentId,
        awayTeamId: fixture.isHome ? fixture.opponentId : teamId,
      },
      teams: new Map(),
      strengthMap,
      avgGoalsPerGame,
      oddsMap,
    });

    return {
      fixtureId: fixture.fixtureId,
      gameweek: fixture.gameweek,
      opponent: fixture.opponent,
      isHome: fixture.isHome,
      csChance: fixture.isHome ? projection.homeCS : projection.awayCS,
      impliedGoals: fixture.isHome ? projection.homeXG : projection.awayXG,
      estimated: projection.estimated,
    };
  });

  return {
    teamId,
    attackIndex,
    defenceIndex,
    upcomingCsChance: outlook[0]?.csChance ?? 0,
    impliedGoalsNext: outlook[0]?.impliedGoals ?? avgGoalsPerGame,
    fixtures: outlook,
    estimated: outlook.some(o => o.estimated),
  };
}

module.exports = {
  buildTeamStrength,
  projectFixture,
  projectPlayer,
  projectTeam,
  poissonCleanSheetProbability,
  mapExpectedPoints,
  calculateSeasonBaseline,
  calculateExpectedMinutes,
};
