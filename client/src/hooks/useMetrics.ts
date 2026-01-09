import { useCallback, useEffect, useState } from 'react';
import type { FixtureContext, PlayerMetrics, TeamMetrics } from '../data/models';
import { getFixtureContext, getPlayerMetrics, getTeamMetrics } from '../data/metricsClient';

const playerMetricsCache = new Map<number, PlayerMetrics>();
const teamMetricsCache = new Map<number, TeamMetrics>();
const fixtureMetricsCache = new Map<number, FixtureContext>();

export function usePlayerMetrics(playerId: number | null, enabled: boolean) {
  const [data, setData] = useState<PlayerMetrics | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!playerId || !enabled) return;
    const cached = playerMetricsCache.get(playerId);
    if (cached) {
      setData(cached);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const result = await getPlayerMetrics(playerId);
      playerMetricsCache.set(playerId, result);
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load player metrics');
    } finally {
      setLoading(false);
    }
  }, [enabled, playerId]);

  useEffect(() => {
    if (!playerId || !enabled) {
      setData(null);
      setLoading(false);
      setError(null);
      return;
    }
    void load();
  }, [enabled, load, playerId]);

  return { data, loading, error };
}

export function useTeamMetrics(teamId: number | null, enabled: boolean) {
  const [data, setData] = useState<TeamMetrics | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!teamId || !enabled) return;
    const cached = teamMetricsCache.get(teamId);
    if (cached) {
      setData(cached);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const result = await getTeamMetrics(teamId);
      teamMetricsCache.set(teamId, result);
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load team metrics');
    } finally {
      setLoading(false);
    }
  }, [enabled, teamId]);

  useEffect(() => {
    if (!teamId || !enabled) {
      setData(null);
      setLoading(false);
      setError(null);
      return;
    }
    void load();
  }, [enabled, load, teamId]);

  return { data, loading, error };
}

export function useFixtureContext(fixtureId: number | null, enabled: boolean) {
  const [data, setData] = useState<FixtureContext | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!fixtureId || !enabled) return;
    const cached = fixtureMetricsCache.get(fixtureId);
    if (cached) {
      setData(cached);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const result = await getFixtureContext(fixtureId);
      fixtureMetricsCache.set(fixtureId, result);
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load fixture context');
    } finally {
      setLoading(false);
    }
  }, [enabled, fixtureId]);

  useEffect(() => {
    if (!fixtureId || !enabled) {
      setData(null);
      setLoading(false);
      setError(null);
      return;
    }
    void load();
  }, [enabled, load, fixtureId]);

  return { data, loading, error };
}
