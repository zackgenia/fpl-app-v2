#!/usr/bin/env node
const fs = require('fs/promises');
const path = require('path');

const LEAGUE = 'EPL';

function getSeason() {
  return process.argv[2] || process.env.UNDERSTAT_SEASON || new Date().getFullYear().toString();
}

function decodeUnderstatJson(raw) {
  const decoded = raw
    .replace(/\\x([0-9a-fA-F]{2})/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
    .replace(/\\'/g, "'")
    .replace(/\\\\/g, '\\');
  return JSON.parse(decoded);
}

function extractJson(html, key) {
  const pattern = new RegExp(`${key}\\s*=\\s*JSON.parse\\('(.*?)'\\)`, 's');
  const match = html.match(pattern);
  if (!match) {
    throw new Error(`Unable to locate ${key} payload`);
  }
  return decodeUnderstatJson(match[1]);
}

async function fetchUnderstatSnapshot() {
  const season = getSeason();
  const url = `https://understat.com/league/${LEAGUE}/${season}`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Understat fetch failed (${response.status})`);
  }
  const html = await response.text();
  const teamsData = extractJson(html, 'teamsData');
  const playersData = extractJson(html, 'playersData');

  const teams = Object.values(teamsData).map(team => ({
    id: team.id,
    name: team.title,
    xG: parseFloat(team.xG),
    xGA: parseFloat(team.xGA),
    npxG: parseFloat(team.npxG),
    npxGA: parseFloat(team.npxGA),
    matches: parseInt(team.m, 10),
  }));

  const players = playersData.map(player => ({
    id: player.id,
    playerName: player.player_name,
    team: player.team_title,
    position: player.position,
    minutes: parseInt(player.time, 10),
    matches: parseInt(player.games, 10),
    shots: parseInt(player.shots, 10),
    keyPasses: parseInt(player.key_passes, 10),
    xG: parseFloat(player.xG),
    xA: parseFloat(player.xA),
    xGI: parseFloat(player.xG) + parseFloat(player.xA),
    xGPer90: parseFloat(player.xG90),
    xAPer90: parseFloat(player.xA90),
  }));

  const snapshot = {
    source: 'understat',
    season,
    league: LEAGUE,
    updatedAt: new Date().toISOString(),
    teams,
    players,
  };

  const outputDir = path.join(__dirname, '..', 'data', 'understat');
  await fs.mkdir(outputDir, { recursive: true });
  const outputPath = path.join(outputDir, `${season}.json`);
  await fs.writeFile(outputPath, JSON.stringify(snapshot, null, 2));

  console.log(`✅ Understat snapshot saved to ${outputPath}`);
}

fetchUnderstatSnapshot().catch(error => {
  console.error('Understat snapshot failed:', error.message);
  process.exit(1);
});
