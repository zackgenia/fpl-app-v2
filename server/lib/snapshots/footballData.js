const fs = require('fs');
const path = require('path');

function loadFootballDataSnapshot() {
  const snapshotPath = path.join(__dirname, '../../../data/football-data/premier-league.json');

  if (!fs.existsSync(snapshotPath)) {
    console.log(`Football-Data snapshot not found at ${snapshotPath}`);
    return null;
  }

  try {
    const data = JSON.parse(fs.readFileSync(snapshotPath, 'utf8'));
    console.log(`✓ Loaded Football-Data snapshot: ${data.standings?.length || 0} teams, ${data.topScorers?.length || 0} scorers`);
    return data;
  } catch (err) {
    console.error('Failed to load Football-Data snapshot:', err.message);
    return null;
  }
}

// Match FPL player to Football-Data player
function matchFootballDataPlayer(fplPlayer, fplTeam, scorers) {
  if (!scorers || !fplPlayer) return null;

  const fplName = fplPlayer.web_name?.toLowerCase() || '';
  const fplSecondName = fplPlayer.second_name?.toLowerCase() || '';
  const fplFirstName = fplPlayer.first_name?.toLowerCase() || '';

  return scorers.find(p => {
    const fdName = p.playerName?.toLowerCase() || '';
    const fdLast = p.lastName?.toLowerCase() || '';
    const fdFirst = p.firstName?.toLowerCase() || '';

    return fdName.includes(fplSecondName) ||
           fplSecondName.includes(fdLast) ||
           (fdFirst && fplFirstName && fdFirst.includes(fplFirstName) && fdLast.includes(fplSecondName.slice(0, 4))) ||
           fdLast.includes(fplName.replace(/^[a-z]\./, ''));
  });
}

// Match FPL team to Football-Data team
function matchFootballDataTeam(fplTeam, standings) {
  if (!standings || !fplTeam) return null;

  const fplTeamName = fplTeam.name?.toLowerCase() || '';
  const fplShortName = fplTeam.short_name?.toLowerCase() || '';

  // Common abbreviation mappings
  const abbreviations = {
    'man city': 'manchester city',
    'man utd': 'manchester united',
    'spurs': 'tottenham',
    'wolves': 'wolverhampton',
    'brighton': 'brighton & hove albion',
    'nott\'m forest': 'nottingham forest',
    'west ham': 'west ham united',
    'newcastle': 'newcastle united',
  };

  const expandedName = abbreviations[fplTeamName] || fplTeamName;

  return standings.find(t => {
    const fdName = t.teamName?.toLowerCase().replace(' fc', '').replace(' afc', '') || '';
    return fdName.includes(expandedName) ||
           expandedName.includes(fdName) ||
           fdName.includes(fplTeamName) ||
           fplTeamName.includes(fdName) ||
           fdName.startsWith(fplShortName);
  });
}

module.exports = { loadFootballDataSnapshot, matchFootballDataPlayer, matchFootballDataTeam };
