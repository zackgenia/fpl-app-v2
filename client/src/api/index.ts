import type { RecommendationResponse, SquadPlayer, Position, Strategy, PlayerPrediction, TeamFixtureData, Fixture, PlayerInsight, TeamInsight, FixtureInsight } from '../types';

const API_BASE = '/api';

async function fetchAPI<T>(endpoint: string, options?: RequestInit, retries = 3): Promise<T> {
  let lastError: Error | null = null;

  for (let i = 0; i < retries; i++) {
    try {
      const response = await fetch(`${API_BASE}${endpoint}`, {
        headers: { 'Content-Type': 'application/json' },
        ...options,
      });

      if (response.status === 503) {
        const data = await response.json();
        throw new Error(data.error || 'Service temporarily unavailable');
      }

      if (!response.ok) {
        const error = await response.json().catch(() => ({ message: 'Unknown error' }));
        throw new Error(error.message || `API Error: ${response.status}`);
      }

      return response.json();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error('Unknown error');
      if (i < retries - 1) {
        await new Promise(r => setTimeout(r, 1000 * (i + 1)));
      }
    }
  }

  throw lastError;
}

export interface BootstrapData {
  players: import('../types').Player[];
  teams: import('../types').Team[];
  currentGameweek: number;
  gameweeks: { id: number; name: string; deadlineTime: string; finished: boolean; isCurrent: boolean; isNext: boolean }[];
}

export async function getBootstrap(): Promise<BootstrapData> {
  return fetchAPI<BootstrapData>('/bootstrap');
}

export async function getPlayerDetail(playerId: number, horizon: number = 5): Promise<{ player: PlayerPrediction; recentMatches: any[] }> {
  return fetchAPI(`/player/${playerId}?horizon=${horizon}`);
}

export async function getRecommendations(
  squad: SquadPlayer[],
  bank: number,
  horizon: number = 5,
  includeInjured: boolean = false,
  strategy: Strategy = 'maxPoints'
): Promise<RecommendationResponse> {
  return fetchAPI<RecommendationResponse>('/recommendations', {
    method: 'POST',
    body: JSON.stringify({ squad, bank, horizon, includeInjured, strategy }),
  }, 3);
}

export async function getTeamFixtures(numWeeks: number = 6): Promise<{ teams: TeamFixtureData[]; fixtures: Fixture[]; currentGameweek: number }> {
  return fetchAPI(`/team-fixtures?weeks=${numWeeks}`);
}

export async function getLiveData(gw: number): Promise<{ gameweek: number; players: any[]; lastUpdated: string }> {
  return fetchAPI(`/live/${gw}`);
}

export async function getPlayerInsights(playerId: number, horizon: number = 5): Promise<PlayerInsight> {
  return fetchAPI(`/insights/player/${playerId}?horizon=${horizon}`);
}

export async function getTeamInsights(teamId: number, horizon: number = 5): Promise<TeamInsight> {
  return fetchAPI(`/insights/team/${teamId}?horizon=${horizon}`);
}

export async function getFixtureInsights(fixtureId: number, horizon: number = 5): Promise<FixtureInsight> {
  return fetchAPI(`/insights/fixture/${fixtureId}?horizon=${horizon}`);
}
