const fs = require('fs');
const path = require('path');

function loadApiFootballSnapshot(season = 2024) {
  const snapshotPath = path.join(__dirname, '../../../data/api-football', `${season}.json`);

  if (!fs.existsSync(snapshotPath)) {
    console.log(`API-Football snapshot not found at ${snapshotPath}`);
    return null;
  }

  try {
    const data = JSON.parse(fs.readFileSync(snapshotPath, 'utf8'));
    console.log(`✓ Loaded API-Football snapshot: ${data.teams?.length || 0} teams, ${data.topScorers?.length || 0} scorers`);
    return data;
  } catch (err) {
    console.error('Failed to load API-Football snapshot:', err.message);
    return null;
  }
}

module.exports = { loadApiFootballSnapshot };
