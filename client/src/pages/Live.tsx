import { useCallback, useEffect, useMemo, useState } from 'react';
import { ErrorMessage, Loading, TeamBadge } from '../components';

const PREVIEW_LIMIT = 120;

interface BootstrapTeam {
  id: number;
  name: string;
  shortName: string;
  badge: string;
}

interface BootstrapResponse {
  currentGameweek: number;
  teams: BootstrapTeam[];
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

async function fetchJson<T>(endpoint: string): Promise<T> {
  const response = await fetch(endpoint);
  const text = await response.text();
  const preview = text.slice(0, PREVIEW_LIMIT).trim();

  if (!response.ok) {
    throw new Error(`Live API request failed (${response.status}): ${preview || 'No response body'}`);
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

export default function Live() {
  const [bootstrap, setBootstrap] = useState<BootstrapResponse | null>(null);
  const [liveData, setLiveData] = useState<LiveResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadLive = useCallback(async (currentGw: number) => {
    const live = await fetchJson<LiveResponse>(`/api/live/${currentGw}`);
    setLiveData(live);
  }, []);

  const loadPage = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const bootstrapData = await fetchJson<BootstrapResponse>('/api/bootstrap');
      setBootstrap(bootstrapData);
      await loadLive(bootstrapData.currentGameweek);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load live data');
    } finally {
      setLoading(false);
    }
  }, [loadLive]);

  const handleRefresh = useCallback(async () => {
    if (!bootstrap) return;
    setRefreshing(true);
    setError(null);
    try {
      await loadLive(bootstrap.currentGameweek);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to refresh live data');
    } finally {
      setRefreshing(false);
    }
  }, [bootstrap, loadLive]);

  useEffect(() => {
    loadPage();
  }, [loadPage]);

  const teamMap = useMemo(() => {
    return new Map((bootstrap?.teams ?? []).map(team => [team.id, team]));
  }, [bootstrap]);

  const sortedPlayers = useMemo(() => {
    if (!liveData) return [];
    return [...liveData.players].sort((a, b) => b.livePoints - a.livePoints);
  }, [liveData]);

  if (loading) return <Loading message="Loading live data..." />;
  if (error) return <ErrorMessage message={error} onRetry={loadPage} />;
  if (!bootstrap || !liveData) return null;

  return (
    <div className="space-y-6">
      <div className="card p-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Live Gameweek {liveData.gameweek}</h2>
          <p className="text-slate-500">
            Updated {new Date(liveData.lastUpdated).toLocaleTimeString()} • {sortedPlayers.length} players tracked
          </p>
        </div>
        <button
          type="button"
          onClick={handleRefresh}
          disabled={refreshing}
          className="px-4 py-2 rounded-lg bg-fpl-forest text-white font-semibold shadow hover:bg-fpl-pine transition disabled:opacity-60"
        >
          {refreshing ? 'Refreshing…' : 'Refresh'}
        </button>
      </div>

      <div className="card p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-100 text-slate-600">
              <tr>
                <th className="text-left px-4 py-3 font-semibold">Player</th>
                <th className="text-left px-4 py-3 font-semibold">Team</th>
                <th className="text-right px-4 py-3 font-semibold">Pts</th>
                <th className="text-right px-4 py-3 font-semibold">Min</th>
                <th className="text-right px-4 py-3 font-semibold">G</th>
                <th className="text-right px-4 py-3 font-semibold">A</th>
                <th className="text-right px-4 py-3 font-semibold">Bonus</th>
                <th className="text-right px-4 py-3 font-semibold">BPS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {sortedPlayers.map(player => {
                const team = teamMap.get(player.teamId);
                return (
                  <tr key={player.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-medium text-slate-800">{player.webName}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2 text-slate-600">
                        <TeamBadge badge={team?.badge ?? ''} name={team?.name ?? 'Unknown'} size="sm" />
                        <span>{team?.shortName ?? 'UNK'}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-emerald-600">{player.livePoints}</td>
                    <td className="px-4 py-3 text-right text-slate-600">{player.minutes}</td>
                    <td className="px-4 py-3 text-right text-slate-600">{player.goals}</td>
                    <td className="px-4 py-3 text-right text-slate-600">{player.assists}</td>
                    <td className="px-4 py-3 text-right text-slate-600">{player.bonus}</td>
                    <td className="px-4 py-3 text-right text-slate-600">{player.bps}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
