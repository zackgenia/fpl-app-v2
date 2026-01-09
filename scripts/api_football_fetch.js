#!/usr/bin/env node
const fs = require('fs/promises');
const path = require('path');

// API-Football configuration
// Get your free API key at: https://www.api-football.com/
const API_KEY = process.env.API_FOOTBALL_KEY;
const BASE_URL = 'https://v3.football.api-sports.io';
const LEAGUE_ID = 39; // Premier League
const SEASON = process.env.API_FOOTBALL_SEASON || 2024;

async function fetchAPI(endpoint) {
  if (!API_KEY) {
    throw new Error('API_FOOTBALL_KEY environment variable is required. Get a free key at https://www.api-football.com/');
  }

  const response = await fetch(`${BASE_URL}${endpoint}`, {
    headers: {
      'x-apisports-key': API_KEY,
    },
  });

  if (!response.ok) {
    throw new Error(`API-Football request failed (${response.status})`);
  }

  const data = await response.json();

  if (data.errors && Object.keys(data.errors).length > 0) {
    throw new Error(`API-Football error: ${JSON.stringify(data.errors)}`);
  }

  return data.response;
}

async function fetchTeamStats() {
  console.log('Fetching team statistics...');
  const teams = await fetchAPI(`/teams?league=${LEAGUE_ID}&season=${SEASON}`);

  const teamStats = [];
  for (const { team } of teams) {
    // Rate limit: free tier allows 10 requests/minute
    await new Promise(r => setTimeout(r, 6500));

    try {
      const stats = await fetchAPI(`/teams/statistics?league=${LEAGUE_ID}&season=${SEASON}&team=${team.id}`);
      teamStats.push({
        id: team.id,
        name: team.name,
        logo: team.logo,
        form: stats.form,
        fixtures: stats.fixtures,
        goals: stats.goals,
        cleanSheet: stats.clean_sheet,
        failedToScore: stats.failed_to_score,
      });
      console.log(`  ✓ ${team.name}`);
    } catch (err) {
      console.log(`  ✗ ${team.name}: ${err.message}`);
    }
  }

  return teamStats;
}

async function fetchTopScorers() {
  console.log('Fetching top scorers...');
  const scorers = await fetchAPI(`/players/topscorers?league=${LEAGUE_ID}&season=${SEASON}`);

  return scorers.map(({ player, statistics }) => {
    const stat = statistics[0] || {};
    return {
      id: player.id,
      name: player.name,
      firstName: player.firstname,
      lastName: player.lastname,
      photo: player.photo,
      team: stat.team?.name,
      teamId: stat.team?.id,
      position: stat.games?.position,
      appearances: stat.games?.appearences || 0,
      minutes: stat.games?.minutes || 0,
      goals: stat.goals?.total || 0,
      assists: stat.goals?.assists || 0,
      shots: stat.shots?.total || 0,
      shotsOnTarget: stat.shots?.on || 0,
      keyPasses: stat.passes?.key || 0,
      rating: stat.games?.rating ? parseFloat(stat.games.rating) : null,
    };
  });
}

async function fetchTopAssists() {
  console.log('Fetching top assists...');
  const assisters = await fetchAPI(`/players/topassists?league=${LEAGUE_ID}&season=${SEASON}`);

  return assisters.map(({ player, statistics }) => {
    const stat = statistics[0] || {};
    return {
      id: player.id,
      name: player.name,
      team: stat.team?.name,
      teamId: stat.team?.id,
      assists: stat.goals?.assists || 0,
      goals: stat.goals?.total || 0,
    };
  });
}

async function fetchSnapshot() {
  console.log(`\n📊 Fetching API-Football data for Premier League ${SEASON}/${SEASON + 1}\n`);

  const [teams, topScorers, topAssists] = await Promise.all([
    fetchTeamStats(),
    fetchTopScorers(),
    fetchTopAssists(),
  ]);

  const snapshot = {
    source: 'api-football',
    season: SEASON,
    league: 'Premier League',
    leagueId: LEAGUE_ID,
    updatedAt: new Date().toISOString(),
    teams,
    topScorers,
    topAssists,
  };

  const outputDir = path.join(__dirname, '..', 'data', 'api-football');
  await fs.mkdir(outputDir, { recursive: true });
  const outputPath = path.join(outputDir, `${SEASON}.json`);
  await fs.writeFile(outputPath, JSON.stringify(snapshot, null, 2));

  console.log(`\n✅ API-Football snapshot saved to ${outputPath}`);
  console.log(`   Teams: ${teams.length}`);
  console.log(`   Top Scorers: ${topScorers.length}`);
  console.log(`   Top Assists: ${topAssists.length}`);
}

fetchSnapshot().catch(error => {
  console.error('API-Football snapshot failed:', error.message);
  process.exit(1);
});
