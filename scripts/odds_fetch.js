#!/usr/bin/env node
const fs = require('fs/promises');
const path = require('path');

const FPL_BASE_URL = 'https://fantasy.premierleague.com/api';

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

async function fetchJson(endpoint) {
  const response = await fetch(`${FPL_BASE_URL}${endpoint}`);
  if (!response.ok) {
    throw new Error(`FPL fetch failed (${response.status})`);
  }
  return response.json();
}

async function generateMockOdds() {
  const bootstrap = await fetchJson('/bootstrap-static/');
  const fixtures = await fetchJson('/fixtures/');
  const currentGW = bootstrap.events.find(gw => gw.is_current)?.id ?? 1;

  const upcoming = fixtures.filter(f => f.event !== null && f.event >= currentGW && f.event < currentGW + 6);

  const snapshot = {
    source: 'mock-odds',
    updatedAt: new Date().toISOString(),
    fixtures: upcoming.map(f => {
      const homeDiff = f.team_h_difficulty ?? 3;
      const awayDiff = f.team_a_difficulty ?? 3;
      const homeXG = clamp(1.8 - 0.2 * (homeDiff - 3), 0.6, 3.2);
      const awayXG = clamp(1.5 - 0.2 * (awayDiff - 3), 0.5, 2.8);
      const homeCS = clamp(0.45 - 0.06 * (homeDiff - 3), 0.1, 0.65);
      const awayCS = clamp(0.4 - 0.06 * (awayDiff - 3), 0.1, 0.6);
      return {
        fixtureId: f.id,
        kickoff: f.kickoff_time,
        homeTeamId: f.team_h,
        awayTeamId: f.team_a,
        impliedGoals: {
          homeXG: Math.round(homeXG * 100) / 100,
          awayXG: Math.round(awayXG * 100) / 100,
        },
        cleanSheetProb: {
          homeCS: Math.round(homeCS * 1000) / 10,
          awayCS: Math.round(awayCS * 1000) / 10,
        },
      };
    }),
  };

  const outputDir = path.join(__dirname, '..', 'data', 'odds');
  await fs.mkdir(outputDir, { recursive: true });
  const outputPath = path.join(outputDir, 'mock.json');
  await fs.writeFile(outputPath, JSON.stringify(snapshot, null, 2));

  console.log(`✅ Mock odds snapshot saved to ${outputPath}`);
}

generateMockOdds().catch(error => {
  console.error('Mock odds snapshot failed:', error.message);
  process.exit(1);
});
