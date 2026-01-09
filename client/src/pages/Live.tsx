import { useCallback, useEffect, useMemo, useState } from 'react';
import { ErrorMessage, Loading, GameweekSelector, LiveFixturesHub, PlayerPointsPanel, FixtureDetailsDrawer } from '../components';
import { getGameweekStatus, type RawFixture } from '../utils/fixtureStatus';

const PREVIEW_LIMIT = 120;

interface BootstrapTeam {
  id: number;
  name: string;
  shortName: string;
  badge: string;
}

interface BootstrapGameweek {
  id: number;
  name: string;
  finished: boolean;
  is_current: boolean;
  is_next: boolean;
}

interface BootstrapResponse {
  currentGameweek: number;
  teams: BootstrapTeam[];
  gameweeks: BootstrapGameweek[];
}

interface LivePlayer {
  id: number;
  webName: string;
  teamId: number;
  livePoints: number;
  minutes: number;
  goals: number;
  assists: number;
  bonus: number;
  bps: number;
}

interface LiveResponse {
  gameweek: number;
  players: LivePlayer[];
  lastUpdated: string;
}

// FPL fixtures endpoint returns raw array

async function fetchJson<T>(endpoint: string): Promise<T> {
  const response = await fetch(endpoint);
  const text = await response.text();
  const preview = text.slice(0, PREVIEW_LIMIT).trim();

  if (!response.ok) {
    throw new Error(`API request failed (${response.status}): ${preview || 'No response body'}`);
  }

  const contentType = response.headers.get('content-type') ?? '';
  if (!contentType.includes('application/json')) {
    throw new Error(`Expected JSON response (${response.status}): ${preview || 'No response body'}`);
  }

  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error(`Invalid JSON response (${response.status}): ${preview || 'No response body'}`);
  }
}

export default function Live({ onPlayerClick }: { onPlayerClick?: (id: number) => void; onFixtureClick?: (id: number) => void }) {
  const [bootstrap, setBootstrap] = useState<BootstrapResponse | null>(null);
  const [fixtures, setFixtures] = useState<RawFixture[]>([]);
  const [liveData, setLiveData] = useState<LiveResponse | null>(null);
  const [selectedGw, setSelectedGw] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [liveError, setLiveError] = useState<string | null>(null);
  const [selectedFixtureId, setSelectedFixtureId] = useState<number | null>(null);

  // Load bootstrap and fixtures
  const loadInitial = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [bootstrapData, fixturesData] = await Promise.all([
        fetchJson<BootstrapResponse>('/api/bootstrap'),
        fetchJson<RawFixture[]>('/api/fpl/fixtures').catch(() => []),
      ]);
      setBootstrap(bootstrapData);
      setFixtures(Array.isArray(fixturesData) ? fixturesData : []);

      // Determine initial GW to show
      const currentGw = bootstrapData.currentGameweek;
      setSelectedGw(currentGw);

      // Load live data for current GW
      try {
        const live = await fetchJson<LiveResponse>(`/api/live/${currentGw}`);
        setLiveData(live);
      } catch {
        setLiveError('Live data temporarily unavailable');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  }, []);

  // Load live data for selected GW
  const loadLiveData = useCallback(async (gw: number) => {
    setRefreshing(true);
    setLiveError(null);
    try {
      const live = await fetchJson<LiveResponse>(`/api/live/${gw}`);
      setLiveData(live);
    } catch {
      setLiveError('Live data temporarily unavailable');
    } finally {
      setRefreshing(false);
    }
  }, []);

  // Handle GW selection change
  const handleGwSelect = useCallback((gw: number) => {
    setSelectedGw(gw);
    loadLiveData(gw);
  }, [loadLiveData]);

  // Handle manual refresh
  const handleRefresh = useCallback(() => {
    if (selectedGw) {
      loadLiveData(selectedGw);
    }
  }, [selectedGw, loadLiveData]);

  // Initial load
  useEffect(() => {
    loadInitial();
  }, [loadInitial]);

  // Auto-refresh for live GWs (every 30s)
  useEffect(() => {
    if (!selectedGw || !fixtures.length) return;

    const gwFixtures = fixtures.filter(f => f.event === selectedGw);
    const status = getGameweekStatus(gwFixtures as RawFixture[]);

    if (status === 'LIVE') {
      const interval = setInterval(() => {
        loadLiveData(selectedGw);
      }, 30000);
      return () => clearInterval(interval);
    }
  }, [selectedGw, fixtures, loadLiveData]);

  // Memoized data
  const teamMap = useMemo(() => {
    return new Map((bootstrap?.teams ?? []).map(team => [team.id, team]));
  }, [bootstrap]);

  const gwFixtures = useMemo(() => {
    if (!selectedGw) return [];
    return fixtures.filter(f => f.event === selectedGw) as RawFixture[];
  }, [fixtures, selectedGw]);

  const gwStatus = useMemo(() => {
    return getGameweekStatus(gwFixtures);
  }, [gwFixtures]);

  const lastUpdatedTime = useMemo(() => {
    if (!liveData?.lastUpdated) return null;
    return new Date(liveData.lastUpdated).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  }, [liveData]);

  if (loading) return <Loading message="Loading live data..." />;
  if (error) return <ErrorMessage message={error} onRetry={loadInitial} />;
  if (!bootstrap) return null;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="bg-slate-800 border border-slate-700 rounded-lg p-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          {/* Title and status */}
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-semibold text-slate-100">
              GW{selectedGw}
            </h2>
            <span
              className={`px-2 py-0.5 rounded text-xs font-semibold uppercase ${
                gwStatus === 'LIVE'
                  ? 'bg-emerald-500/20 text-emerald-400'
                  : gwStatus === 'FINISHED'
                  ? 'bg-slate-700 text-slate-400'
                  : 'bg-blue-500/20 text-blue-400'
              }`}
            >
              {gwStatus === 'LIVE' && (
                <span className="inline-block w-1.5 h-1.5 bg-emerald-400 rounded-full mr-1 animate-pulse" />
              )}
              {gwStatus}
            </span>
            {lastUpdatedTime && (
              <span className="text-xs text-slate-500 font-mono">
                Updated {lastUpdatedTime}
              </span>
            )}
          </div>

          {/* Controls */}
          <div className="flex items-center gap-3">
            <GameweekSelector
              currentGw={bootstrap.currentGameweek}
              selectedGw={selectedGw ?? bootstrap.currentGameweek}
              onSelect={handleGwSelect}
              gwStatus={gwStatus}
            />
            <button
              type="button"
              onClick={handleRefresh}
              disabled={refreshing}
              className="px-3 py-1.5 rounded bg-slate-700 hover:bg-slate-600 text-slate-200 text-sm font-medium transition-colors disabled:opacity-50"
            >
              {refreshing ? 'Refreshing...' : 'Refresh'}
            </button>
          </div>
        </div>
      </div>

      {/* Live error banner */}
      {liveError && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg px-4 py-3">
          <p className="text-amber-400 text-sm">{liveError}</p>
        </div>
      )}

      {/* Match cards */}
      <div>
        <h3 className="text-sm font-medium text-slate-400 uppercase tracking-wide mb-3">
          Fixtures
        </h3>
        <LiveFixturesHub
          fixtures={gwFixtures}
          teams={teamMap}
          onFixtureClick={(id) => setSelectedFixtureId(id)}
        />
      </div>

      {/* Player points panel */}
      {liveData && liveData.players.length > 0 && (
        <div className="mt-6">
          <PlayerPointsPanel
            players={liveData.players}
            teams={teamMap}
            onPlayerClick={onPlayerClick}
            defaultExpanded={gwStatus === 'LIVE'}
          />
        </div>
      )}

      {/* Fixture details drawer */}
      <FixtureDetailsDrawer
        fixtureId={selectedFixtureId}
        onClose={() => setSelectedFixtureId(null)}
        onPlayerClick={onPlayerClick}
      />
    </div>
  );
}
