import { useCallback, useEffect, useState } from 'react';
import { getPlayerDetail, getTeamFixtures } from '../api';
import type { Fixture, PlayerPrediction, TeamFixtureData } from '../types';

type PlayerDetailResponse = { player: PlayerPrediction; recentMatches: any[] };
type TeamFixturesResponse = { teams: TeamFixtureData[]; fixtures: Fixture[]; currentGameweek: number };

const playerCache = new Map<number, PlayerDetailResponse>();
let teamFixturesCache: TeamFixturesResponse | null = null;

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
