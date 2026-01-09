#!/usr/bin/env node
const fs = require('fs/promises');
const path = require('path');

// Football-Data.org configuration
// Get your free API key at: https://www.football-data.org/client/register
const API_KEY = process.env.FOOTBALL_DATA_KEY;
const BASE_URL = 'https://api.football-data.org/v4';
const COMPETITION = 'PL'; // Premier League

async function fetchAPI(endpoint) {
  if (!API_KEY) {
    throw new Error('FOOTBALL_DATA_KEY environment variable is required. Get a free key at https://www.football-data.org/client/register');
  }

  const response = await fetch(`${BASE_URL}${endpoint}`, {
    headers: {
      'X-Auth-Token': API_KEY,
    },
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Football-Data API error (${response.status}): ${text}`);
  }

  return response.json();
}

async function fetchSnapshot() {
  console.log(`\n⚽ Fetching Football-Data.org data for Premier League\n`);

  // Fetch multiple endpoints
  console.log('Fetching standings...');
  const standings = await fetchAPI(`/competitions/${COMPETITION}/standings`);

  // Rate limit: free tier is 10 requests/minute
  await new Promise(r => setTimeout(r, 6500));

  console.log('Fetching top scorers...');
  const scorers = await fetchAPI(`/competitions/${COMPETITION}/scorers?limit=50`);

  await new Promise(r => setTimeout(r, 6500));

  console.log('Fetching teams...');
  const teams = await fetchAPI(`/competitions/${COMPETITION}/teams`);

  await new Promise(r => setTimeout(r, 6500));

  console.log('Fetching matches...');
  const matches = await fetchAPI(`/competitions/${COMPETITION}/matches?status=SCHEDULED&limit=50`);

  // Process standings
  const table = standings.standings?.[0]?.table?.map(row => ({
    position: row.position,
    teamId: row.team.id,
    teamName: row.team.name,
    teamCrest: row.team.crest,
    playedGames: row.playedGames,
    won: row.won,
    draw: row.draw,
    lost: row.lost,
    points: row.points,
    goalsFor: row.goalsFor,
    goalsAgainst: row.goalsAgainst,
    goalDifference: row.goalDifference,
    form: row.form,
  })) || [];

  // Process scorers
  const topScorers = scorers.scorers?.map(s => ({
    playerId: s.player.id,
    playerName: s.player.name,
    firstName: s.player.firstName,
    lastName: s.player.lastName,
    nationality: s.player.nationality,
    position: s.player.position,
    teamId: s.team.id,
    teamName: s.team.name,
    goals: s.goals,
    assists: s.assists,
    penalties: s.penalties,
    playedMatches: s.playedMatches,
  })) || [];

  // Process teams with squad info
  const teamsData = teams.teams?.map(t => ({
    id: t.id,
    name: t.name,
    shortName: t.shortName,
    tla: t.tla,
    crest: t.crest,
    venue: t.venue,
    coach: t.coach ? {
      id: t.coach.id,
      name: t.coach.name,
      nationality: t.coach.nationality,
    } : null,
    squadSize: t.squad?.length || 0,
  })) || [];

  // Process upcoming matches
  const upcomingMatches = matches.matches?.map(m => ({
    id: m.id,
    matchday: m.matchday,
    utcDate: m.utcDate,
    status: m.status,
    homeTeam: { id: m.homeTeam.id, name: m.homeTeam.name },
    awayTeam: { id: m.awayTeam.id, name: m.awayTeam.name },
  })) || [];

  const snapshot = {
    source: 'football-data.org',
    competition: COMPETITION,
    season: standings.season?.startDate?.slice(0, 4) || new Date().getFullYear(),
    updatedAt: new Date().toISOString(),
    standings: table,
    topScorers,
    teams: teamsData,
    upcomingMatches,
  };

  const outputDir = path.join(__dirname, '..', 'data', 'football-data');
  await fs.mkdir(outputDir, { recursive: true });
  const outputPath = path.join(outputDir, 'premier-league.json');
  await fs.writeFile(outputPath, JSON.stringify(snapshot, null, 2));

  console.log(`\n✅ Football-Data snapshot saved to ${outputPath}`);
  console.log(`   Standings: ${table.length} teams`);
  console.log(`   Top Scorers: ${topScorers.length} players`);
  console.log(`   Teams: ${teamsData.length}`);
  console.log(`   Upcoming Matches: ${upcomingMatches.length}`);
}

fetchSnapshot().catch(error => {
  console.error('Football-Data snapshot failed:', error.message);
  process.exit(1);
});
