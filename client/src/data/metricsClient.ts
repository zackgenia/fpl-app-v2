import type { FixtureContext, PlayerMetrics, TeamMetrics } from './models';

const API_BASE = '/api/metrics';
const cache = new Map<string, unknown>();

async function fetchMetrics<T>(endpoint: string, cacheKey: string): Promise<T> {
  if (cache.has(cacheKey)) return cache.get(cacheKey) as T;
  const response = await fetch(`${API_BASE}${endpoint}`);
  if (!response.ok) {
    throw new Error(`Metrics error (${response.status})`);
  }
  const data = await response.json();
  cache.set(cacheKey, data);
  return data as T;
}

export async function getPlayerMetrics(playerId: number): Promise<PlayerMetrics> {
  return fetchMetrics(`/player/${playerId}`, `player:${playerId}`);
}

export async function getTeamMetrics(teamId: number): Promise<TeamMetrics> {
  return fetchMetrics(`/team/${teamId}`, `team:${teamId}`);
}

export async function getFixtureContext(fixtureId: number): Promise<FixtureContext> {
  return fetchMetrics(`/fixture/${fixtureId}`, `fixture:${fixtureId}`);
}
