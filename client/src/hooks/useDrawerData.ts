import { useCallback, useEffect, useState } from 'react';
import { getFixtureInsights, getPlayerDetail, getPlayerInsights, getTeamFixtures, getTeamInsights } from '../api';
import type { Fixture, FixtureInsight, PlayerInsight, PlayerPrediction, TeamFixtureData, TeamInsight } from '../types';

type PlayerDetailResponse = { player: PlayerPrediction; recentMatches: any[] };
type TeamFixturesResponse = { teams: TeamFixtureData[]; fixtures: Fixture[]; currentGameweek: number };

const playerCache = new Map<number, PlayerDetailResponse>();
let teamFixturesCache: TeamFixturesResponse | null = null;
const playerInsightsCache = new Map<string, PlayerInsight>();
const teamInsightsCache = new Map<string, TeamInsight>();
const fixtureInsightsCache = new Map<string, FixtureInsight>();

export function usePlayerDetailData(playerId: number | null, isActive: boolean) {
  const [data, setData] = useState<PlayerDetailResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (force = false) => {
    if (!playerId) return;
    const cached = playerCache.get(playerId);
    if (cached && !force) {
      setData(cached);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const result = await getPlayerDetail(playerId);
      playerCache.set(playerId, result);
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load player');
    } finally {
      setLoading(false);
    }
  }, [playerId]);

  useEffect(() => {
    if (!playerId) {
      setData(null);
      setLoading(false);
      setError(null);
      return;
    }
    void load();
  }, [load, playerId]);

  useEffect(() => {
    if (!isActive || !playerId) return;
    const interval = window.setInterval(() => {
      void load(true);
    }, 30000);
    return () => window.clearInterval(interval);
  }, [isActive, load, playerId]);

  return { data, loading, error };
}

export function useTeamFixturesData(isActive: boolean) {
  const [data, setData] = useState<TeamFixturesResponse | null>(teamFixturesCache);
  const [loading, setLoading] = useState(!teamFixturesCache);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (force = false) => {
    if (teamFixturesCache && !force) {
      setData(teamFixturesCache);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const result = await getTeamFixtures();
      teamFixturesCache = result;
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load fixtures');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!isActive) return;
    const interval = window.setInterval(() => {
      void load(true);
    }, 30000);
    return () => window.clearInterval(interval);
  }, [isActive, load]);

  return { data, loading, error };
}

export function usePlayerInsightsData(playerId: number | null, isActive: boolean, horizon: number = 5) {
  const [data, setData] = useState<PlayerInsight | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (force = false) => {
    if (!playerId) return;
    const cacheKey = `${playerId}:${horizon}`;
    const cached = playerInsightsCache.get(cacheKey);
    if (cached && !force) {
      setData(cached);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const result = await getPlayerInsights(playerId, horizon);
      playerInsightsCache.set(cacheKey, result);
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load insights');
    } finally {
      setLoading(false);
    }
  }, [horizon, playerId]);

  useEffect(() => {
    if (!playerId) {
      setData(null);
      setLoading(false);
      setError(null);
      return;
    }
    void load();
  }, [load, playerId]);

  useEffect(() => {
    if (!isActive || !playerId) return;
    const interval = window.setInterval(() => {
      void load(true);
    }, 60000);
    return () => window.clearInterval(interval);
  }, [isActive, load, playerId]);

  return { data, loading, error };
}

export function useTeamInsightsData(teamId: number | null, isActive: boolean, horizon: number = 5) {
  const [data, setData] = useState<TeamInsight | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (force = false) => {
    if (!teamId) return;
    const cacheKey = `${teamId}:${horizon}`;
    const cached = teamInsightsCache.get(cacheKey);
    if (cached && !force) {
      setData(cached);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const result = await getTeamInsights(teamId, horizon);
      teamInsightsCache.set(cacheKey, result);
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load insights');
    } finally {
      setLoading(false);
    }
  }, [horizon, teamId]);

  useEffect(() => {
    if (!teamId) {
      setData(null);
      setLoading(false);
      setError(null);
      return;
    }
    void load();
  }, [load, teamId]);

  useEffect(() => {
    if (!isActive || !teamId) return;
    const interval = window.setInterval(() => {
      void load(true);
    }, 60000);
    return () => window.clearInterval(interval);
  }, [isActive, load, teamId]);

  return { data, loading, error };
}

export function useFixtureInsightsData(fixtureId: number | null, isActive: boolean, horizon: number = 5) {
  const [data, setData] = useState<FixtureInsight | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (force = false) => {
    if (!fixtureId) return;
    const cacheKey = `${fixtureId}:${horizon}`;
    const cached = fixtureInsightsCache.get(cacheKey);
    if (cached && !force) {
      setData(cached);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const result = await getFixtureInsights(fixtureId, horizon);
      fixtureInsightsCache.set(cacheKey, result);
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load insights');
    } finally {
      setLoading(false);
    }
  }, [fixtureId, horizon]);

  useEffect(() => {
    if (!fixtureId) {
      setData(null);
      setLoading(false);
      setError(null);
      return;
    }
    void load();
  }, [fixtureId, load]);

  useEffect(() => {
    if (!isActive || !fixtureId) return;
    const interval = window.setInterval(() => {
      void load(true);
    }, 60000);
    return () => window.clearInterval(interval);
  }, [fixtureId, isActive, load]);

  return { data, loading, error };
}
