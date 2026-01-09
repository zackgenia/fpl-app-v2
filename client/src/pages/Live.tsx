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

export default function Live({ onPlayerClick }: { onPlayerClick?: (id: number) => void }) {
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
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-slate-100">
            Live GW{liveData.gameweek}
          </h2>
          <p className="text-sm text-slate-500 font-mono">
            {new Date(liveData.lastUpdated).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} | {sortedPlayers.length} players
          </p>
        </div>
        <button
          type="button"
          onClick={handleRefresh}
          disabled={refreshing}
          className="px-3 py-1.5 rounded bg-slate-700 hover:bg-slate-600 text-slate-200 text-sm font-medium transition-colors disabled:opacity-50"
        >
          {refreshing ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>

      {/* Financial-style Table */}
      <div className="bg-slate-800 border border-slate-700 rounded overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-700 text-xs uppercase text-slate-500">
                <th className="text-left px-3 py-2 font-medium">Player</th>
                <th className="text-left px-3 py-2 font-medium">Team</th>
                <th className="text-right px-3 py-2 font-medium">Pts</th>
                <th className="text-right px-3 py-2 font-medium">Min</th>
                <th className="text-right px-3 py-2 font-medium">G</th>
                <th className="text-right px-3 py-2 font-medium">A</th>
                <th className="text-right px-3 py-2 font-medium">Bon</th>
                <th className="text-right px-3 py-2 font-medium">BPS</th>
              </tr>
            </thead>
            <tbody>
              {sortedPlayers.map((player, idx) => {
                const team = teamMap.get(player.teamId);
                return (
                  <tr
                    key={player.id}
                    className={`border-b border-slate-800 hover:bg-slate-700/50 transition-colors ${
                      idx % 2 === 0 ? 'bg-slate-800/30' : ''
                    }`}
                  >
                    <td className="px-3 py-2">
                      <button
                        type="button"
                        onClick={() => onPlayerClick?.(player.id)}
                        className="text-slate-200 hover:text-emerald-400 font-medium transition-colors"
                      >
                        {player.webName}
                      </button>
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-2 text-slate-400">
                        <TeamBadge badge={team?.badge ?? ''} name={team?.name ?? 'Unknown'} size="sm" />
                        <span className="text-xs">{team?.shortName ?? 'UNK'}</span>
                      </div>
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums font-semibold text-emerald-400">
                      {player.livePoints}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums text-slate-400">
                      {player.minutes}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums text-slate-400">
                      {player.goals > 0 ? <span className="text-emerald-400">{player.goals}</span> : '-'}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums text-slate-400">
                      {player.assists > 0 ? <span className="text-emerald-400">{player.assists}</span> : '-'}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums text-slate-400">
                      {player.bonus > 0 ? <span className="text-amber-400">{player.bonus}</span> : '-'}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums text-slate-500">
                      {player.bps}
                    </td>
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
