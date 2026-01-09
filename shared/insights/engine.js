const POSITION_POINTS = {
  GK: { goal: 6, assist: 3, cleanSheet: 4 },
  DEF: { goal: 6, assist: 3, cleanSheet: 4 },
  MID: { goal: 5, assist: 3, cleanSheet: 1 },
  FWD: { goal: 4, assist: 3, cleanSheet: 0 },
};

const FIXTURE_WEIGHTS = [1, 0.95, 0.9, 0.85, 0.8];
const HOME_ADVANTAGE = 1.08;
const AWAY_PENALTY = 0.92;

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

function calculateExpectedMinutes(history, availability) {
  const recentHistory = history?.slice(-5) ?? [];
  const avgMinutes = recentHistory.length > 0
    ? recentHistory.reduce((sum, h) => sum + (h.minutes ?? 0), 0) / recentHistory.length
    : 75;

  let roleFactor = 0.9;
  if (avgMinutes >= 80) roleFactor = 1.0;
  else if (avgMinutes >= 60) roleFactor = 0.9;
  else roleFactor = 0.8;

  const availabilityFactor = availability !== null && availability !== undefined ? availability / 100 : 0.9;
  const expectedMinutes = clamp(avgMinutes * roleFactor * availabilityFactor, 0, 90);

  return { expectedMinutes, roleFactor, avgMinutes };
}

function computeAttackingOutputs({
  player,
  expectedMinutes,
  opponentDefenceIndex,
  fixtureDifficulty,
  understatPlayer,
}) {
  const opponentAdjustment = clamp(1 / (opponentDefenceIndex || 1), 0.7, 1.3);
  const minutesFactor = expectedMinutes / 90;

  let xGI90 = 0;
  let xG = 0;
  let xA = 0;
  let isEstimated = false;

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
    const ict = parseFloat(player.ict_index || 0);
    const form = parseFloat(player.form || 0);
    const base = clamp((ict + form * 2) / 15, 0.1, 1.2);
    xGI90 = base;
    isEstimated = true;
  }

  const difficultyMultiplier = clamp(1.15 - (fixtureDifficulty - 1) * 0.08, 0.8, 1.2);
  const expectedGI = xGI90 * minutesFactor * opponentAdjustment * difficultyMultiplier;
  const xGShare = xG + xA > 0 ? xG / (xG + xA) : 0.6;

  return {
    expectedGI,
    expectedGoals: expectedGI * xGShare,
    expectedAssists: expectedGI * (1 - xGShare),
    xG,
    xA,
    xGI90,
    isEstimated,
  };
}

function mapExpectedPoints({ position, expectedMinutes, expectedGoals, expectedAssists, cleanSheetProb, bonusExpectation }) {
  const points = POSITION_POINTS[position] ?? POSITION_POINTS.MID;
  const minutesFactor = expectedMinutes / 90;
  const appearancePoints = clamp(minutesFactor, 0, 1) + clamp(expectedMinutes / 60, 0, 1);
  const goalPoints = expectedGoals * points.goal;
  const assistPoints = expectedAssists * points.assist;
  const cleanSheetPoints = cleanSheetProb * points.cleanSheet * minutesFactor;
  const bonusPoints = bonusExpectation;

  return {
    appearancePoints,
    goalPoints,
    assistPoints,
    cleanSheetPoints,
    bonusPoints,
    total: appearancePoints + goalPoints + assistPoints + cleanSheetPoints + bonusPoints,
  };
}

function projectPlayer({
  player,
  fixtures,
  strengthMap,
  avgGoalsPerGame,
  understatPlayers,
  oddsMap,
}) {
  const position = player.position;
  const availability = player.chance_of_playing_next_round ?? player.chanceOfPlaying ?? 90;
  const { expectedMinutes } = calculateExpectedMinutes(player.history, availability);

  const fixtureProjections = fixtures.map((fixture, index) => {
    const opponentStrength = strengthMap.get(fixture.opponentId);
    const opponentDefenceIndex = opponentStrength?.defenceIndex ?? 1;
    const understatPlayer = understatPlayers?.get(player.id) || null;

    const attacking = computeAttackingOutputs({
      player,
      expectedMinutes,
      opponentDefenceIndex,
      fixtureDifficulty: fixture.difficulty,
      understatPlayer,
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

    const cleanSheetProb = position === 'MID' || position === 'DEF' || position === 'GK'
      ? (fixture.isHome ? fixtureProjection.homeCS : fixtureProjection.awayCS) / 100
      : 0;

    const bonusExpectation = clamp(parseFloat(player.ict_index || 0) / 20, 0, 1);
    const pointsBreakdown = mapExpectedPoints({
      position,
      expectedMinutes,
      expectedGoals: attacking.expectedGoals,
      expectedAssists: attacking.expectedAssists,
      cleanSheetProb,
      bonusExpectation,
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
    };
  });

  const weightedPoints = fixtureProjections.reduce((sum, f) => sum + f.expectedPoints * f.weight, 0);
  const next3 = fixtureProjections.slice(0, 3).reduce((sum, f) => sum + f.expectedPoints * f.weight, 0);
  const next5 = fixtureProjections.slice(0, 5).reduce((sum, f) => sum + f.expectedPoints * f.weight, 0);
  const nextFixture = fixtureProjections[0]?.expectedPoints ?? 0;

  const base = next5 || weightedPoints;
  const low = base * 0.85;
  const high = base * 1.15;

  const baseBreakdown = fixtureProjections[0]?.breakdown ?? mapExpectedPoints({
    position,
    expectedMinutes,
    expectedGoals: 0,
    expectedAssists: 0,
    cleanSheetProb: 0,
    bonusExpectation: 0,
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
  };
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
};
