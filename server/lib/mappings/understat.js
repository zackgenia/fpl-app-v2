const fs = require('fs');
const path = require('path');

const overridesPath = path.join(__dirname, '..', '..', '..', 'data', 'mappings', 'player_overrides.json');
let overrideCache = null;

const TEAM_NAME_MAP = {
  'man city': 'Manchester City',
  'man utd': 'Manchester United',
  'spurs': 'Tottenham',
  'wolves': 'Wolverhampton Wanderers',
  "nott'm forest": 'Nottingham Forest',
  'west ham': 'West Ham',
  'brighton': 'Brighton',
  'newcastle': 'Newcastle United',
};

function normalize(value) {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/[^a-z0-9]/g, '');
}

function loadOverrides() {
  if (overrideCache) return overrideCache;
  try {
    const raw = fs.readFileSync(overridesPath, 'utf-8');
    overrideCache = JSON.parse(raw);
  } catch (error) {
    overrideCache = {};
  }
  return overrideCache;
}

function resolveUnderstatTeamName(team) {
  if (!team) return '';
  const key = team.short_name ? team.short_name.toLowerCase() : team.name.toLowerCase();
  return TEAM_NAME_MAP[key] || team.name;
}

function matchUnderstatPlayer(fplPlayer, fplTeam, understatPlayers) {
  if (!understatPlayers || understatPlayers.length === 0) return null;
  const overrides = loadOverrides();
  const override = overrides[String(fplPlayer.id)];

  const targetTeam = normalize(resolveUnderstatTeamName(fplTeam));
  let candidates = understatPlayers;

  if (targetTeam) {
    candidates = candidates.filter(p => normalize(p.team) === targetTeam);
  }

  if (override) {
    if (typeof override === 'string') {
      const overrideName = normalize(override);
      return candidates.find(p => normalize(p.playerName) === overrideName) || null;
    }
    if (override.understatName) {
      const overrideName = normalize(override.understatName);
      return candidates.find(p => normalize(p.playerName) === overrideName) || null;
    }
    if (override.understatId) {
      return candidates.find(p => String(p.id) === String(override.understatId)) || null;
    }
  }

  const targetName = normalize(fplPlayer.web_name);
  const exactMatch = candidates.find(p => normalize(p.playerName) === targetName);
  if (exactMatch) return exactMatch;

  const suffixMatch = candidates.find(p => normalize(p.playerName).endsWith(targetName));
  if (suffixMatch) return suffixMatch;

  return null;
}

function matchUnderstatTeam(fplTeam, understatTeams) {
  if (!understatTeams || understatTeams.length === 0) return null;
  const targetTeam = normalize(resolveUnderstatTeamName(fplTeam));
  return understatTeams.find(t => normalize(t.name) === targetTeam) || null;
}

module.exports = { matchUnderstatPlayer, matchUnderstatTeam, resolveUnderstatTeamName };
