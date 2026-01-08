const fs = require('fs/promises');
const path = require('path');
const { Cache } = require('../cache');

const snapshotCache = new Cache(300000);

function getUnderstatSeason() {
  return process.env.UNDERSTAT_SEASON || new Date().getFullYear().toString();
}

async function loadUnderstatSnapshot(season = getUnderstatSeason()) {
  const cacheKey = `understat:${season}`;
  const cached = snapshotCache.get(cacheKey);
  if (cached) return cached;

  const filePath = path.join(__dirname, '..', '..', '..', 'data', 'understat', `${season}.json`);
  try {
    const raw = await fs.readFile(filePath, 'utf-8');
    const data = JSON.parse(raw);
    snapshotCache.set(cacheKey, data);
    return data;
  } catch (error) {
    if (error.code !== 'ENOENT') {
      console.warn('Understat snapshot load failed:', error);
    }
    return null;
  }
}

module.exports = { getUnderstatSeason, loadUnderstatSnapshot };
