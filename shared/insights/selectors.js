const fs = require('fs');
const path = require('path');

const UNDERSTAT_PATHS = [
  path.join(process.cwd(), 'data', 'understat.json'),
  path.join(process.cwd(), 'data', 'understat-snapshot.json'),
  path.join(process.cwd(), 'data', 'understat', 'snapshot.json'),
];

const ODDS_PATHS = [
  path.join(process.cwd(), 'data', 'odds.json'),
  path.join(process.cwd(), 'data', 'odds', 'snapshot.json'),
];

let understatCache = null;
let oddsCache = null;

function readJsonIfExists(filePath) {
  if (!fs.existsSync(filePath)) return null;
  const stats = fs.statSync(filePath);
  if (stats.size > 50 * 1024 * 1024) {
    console.warn(`[insights] Snapshot too large, skipping ${filePath}`);
    return null;
  }
  const raw = fs.readFileSync(filePath, 'utf8');
  return JSON.parse(raw);
}

async function loadUnderstatSnapshot() {
  if (understatCache !== null) return understatCache;

  for (const filePath of UNDERSTAT_PATHS) {
    const data = readJsonIfExists(filePath);
    if (data) {
      understatCache = data;
      return understatCache;
    }
  }

  understatCache = null;
  return understatCache;
}

async function loadOddsSnapshot() {
  if (oddsCache !== null) return oddsCache;

  for (const filePath of ODDS_PATHS) {
    const data = readJsonIfExists(filePath);
    if (data) {
      oddsCache = data;
      return oddsCache;
    }
  }

  oddsCache = null;
  return oddsCache;
}

function buildUnderstatMaps(snapshot) {
  const teamMap = new Map();
  const playerMap = new Map();

  if (!snapshot) return { teams: teamMap, players: playerMap };

  const teams = Array.isArray(snapshot.teams) ? snapshot.teams : [];
  const players = Array.isArray(snapshot.players) ? snapshot.players : [];

  for (const team of teams) {
    if (!team.teamId && !team.fplId) continue;
    const id = team.teamId ?? team.fplId;
    const matches = team.matches ?? team.games ?? 1;
    const xGPerGame = matches > 0 ? team.xG / matches : team.xG ?? 0;
    const xGAPerGame = matches > 0 ? team.xGA / matches : team.xGA ?? 0;
    teamMap.set(id, {
      xGPerGame,
      xGAPerGame,
    });
  }

  for (const player of players) {
    const id = player.fplId ?? player.id;
    if (!id) continue;
    playerMap.set(id, {
      xG: player.xG ?? 0,
      xA: player.xA ?? 0,
      minutes: player.minutes ?? 0,
      shots: player.shots ?? null,
      bigChances: player.bigChances ?? null,
    });
  }

  return { teams: teamMap, players: playerMap };
}

function buildOddsMap(snapshot) {
  const oddsMap = new Map();
  if (!snapshot || !Array.isArray(snapshot.fixtures)) return oddsMap;

  for (const fixture of snapshot.fixtures) {
    if (!fixture.fixtureId) continue;
    oddsMap.set(fixture.fixtureId, {
      homeXG: fixture.homeXG,
      awayXG: fixture.awayXG,
      isEstimated: fixture.isEstimated ?? false,
    });
  }

  return oddsMap;
}

module.exports = {
  loadUnderstatSnapshot,
  loadOddsSnapshot,
  buildUnderstatMaps,
  buildOddsMap,
};
