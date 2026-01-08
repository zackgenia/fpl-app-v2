import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { getTeamFixtures } from '../api';
import { Loading, ErrorMessage, TeamBadge, PlayerPhoto } from '../components';
import type { EntityRef, TeamFixtureData, Fixture } from '../types';

interface HoverInfo {
  opponentId: number;
  rowTeamId: number;
  isHome: boolean;
  gameweek: number;
  x: number;
  y: number;
}

interface Props {
  onEntityClick?: (entity: EntityRef) => void;
}

export function FixtureTracker({ onEntityClick }: Props) {
  const [data, setData] = useState<{ teams: TeamFixtureData[]; fixtures: Fixture[]; currentGameweek: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [numWeeks, setNumWeeks] = useState(6);
  const [sortBy, setSortBy] = useState<'name' | 'difficulty'>('difficulty');
  
  // Hover state for fixture cells (opponent-aware)
  const [hoverInfo, setHoverInfo] = useState<HoverInfo | null>(null);
  const [isHoverVisible, setIsHoverVisible] = useState(false);
  
  // Debounce timers for smooth hover
  const hoverEnterTimer = useRef<NodeJS.Timeout | null>(null);
  const hoverLeaveTimer = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    async function fetch() {
      setLoading(true);
      try {
        const result = await getTeamFixtures(numWeeks);
        setData(result);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load');
      } finally {
        setLoading(false);
      }
    }
    fetch();
  }, [numWeeks]);

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      if (hoverEnterTimer.current) clearTimeout(hoverEnterTimer.current);
      if (hoverLeaveTimer.current) clearTimeout(hoverLeaveTimer.current);
    };
  }, []);

  const teamScores = useMemo(() => {
    if (!data) return new Map<number, number>();
    const scores = new Map<number, number>();
    for (const team of data.teams) {
      const teamFixtures = data.fixtures.filter(f => f.teamId === team.id);
      const avg = teamFixtures.length > 0 ? teamFixtures.reduce((s, f) => s + f.difficulty, 0) / teamFixtures.length : 3;
      scores.set(team.id, avg);
    }
    return scores;
  }, [data]);

  const sortedTeams = useMemo(() => {
    if (!data) return [];
    return [...data.teams].sort((a, b) => {
      if (sortBy === 'name') return a.name.localeCompare(b.name);
      return (teamScores.get(a.id) ?? 3) - (teamScores.get(b.id) ?? 3);
    });
  }, [data, sortBy, teamScores]);

  const gameweeks = useMemo(() => {
    if (!data) return [];
    const gws = new Set<number>();
    data.fixtures.forEach(f => gws.add(f.gameweek));
    return Array.from(gws).sort((a, b) => a - b);
  }, [data]);

  // Cache team data by ID for quick lookup
  const teamsById = useMemo(() => {
    if (!data) return new Map<number, TeamFixtureData>();
    return new Map(data.teams.map(t => [t.id, t]));
  }, [data]);

  // Smooth hover handlers with debounce
  const handleCellMouseEnter = useCallback((
    opponentId: number, 
    rowTeamId: number, 
    isHome: boolean, 
    gameweek: number, 
    e: React.MouseEvent
  ) => {
    // Clear any pending leave timer
    if (hoverLeaveTimer.current) {
      clearTimeout(hoverLeaveTimer.current);
      hoverLeaveTimer.current = null;
    }
    
    // Set hover info immediately for position, but delay visibility
    const newHoverInfo: HoverInfo = {
      opponentId,
      rowTeamId,
      isHome,
      gameweek,
      x: e.clientX,
      y: e.clientY
    };
    
    // If already showing a popup, update immediately (no delay when moving between cells)
    if (isHoverVisible) {
      setHoverInfo(newHoverInfo);
    } else {
      // Delay showing popup on initial hover
      setHoverInfo(newHoverInfo);
      if (hoverEnterTimer.current) clearTimeout(hoverEnterTimer.current);
      hoverEnterTimer.current = setTimeout(() => {
        setIsHoverVisible(true);
      }, 120);
    }
  }, [isHoverVisible]);

  const handleCellMouseMove = useCallback((e: React.MouseEvent) => {
    if (hoverInfo) {
      setHoverInfo(prev => prev ? { ...prev, x: e.clientX, y: e.clientY } : null);
    }
  }, [hoverInfo]);

  const handleCellMouseLeave = useCallback(() => {
    // Clear any pending enter timer
    if (hoverEnterTimer.current) {
      clearTimeout(hoverEnterTimer.current);
      hoverEnterTimer.current = null;
    }
    
    // Delay hiding popup
    hoverLeaveTimer.current = setTimeout(() => {
      setIsHoverVisible(false);
      setHoverInfo(null);
    }, 150);
  }, []);

  const handleHoverCardEnter = useCallback(() => {
    if (hoverLeaveTimer.current) {
      clearTimeout(hoverLeaveTimer.current);
      hoverLeaveTimer.current = null;
    }
  }, []);

  const handleHoverCardLeave = useCallback(() => {
    hoverLeaveTimer.current = setTimeout(() => {
      setIsHoverVisible(false);
      setHoverInfo(null);
    }, 150);
  }, []);

  const getFdrClass = (d: number) => `fdr-${d}`;
  const getFdrLabel = (avg: number) => {
    if (avg <= 2) return { label: 'Excellent', color: 'text-emerald-600' };
    if (avg <= 2.5) return { label: 'Good', color: 'text-green-600' };
    if (avg <= 3) return { label: 'Average', color: 'text-yellow-600' };
    if (avg <= 3.5) return { label: 'Tough', color: 'text-orange-600' };
    return { label: 'Very Hard', color: 'text-red-600' };
  };

  if (loading) return <Loading message="Loading fixture data..." />;
  if (error) return <ErrorMessage message={error} />;
  if (!data) return null;

  // Get opponent team data for hover popup
  const hoveredOpponentData = hoverInfo ? teamsById.get(hoverInfo.opponentId) : null;
  const hoveredRowTeamData = hoverInfo ? teamsById.get(hoverInfo.rowTeamId) : null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="card p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-slate-800">Fixture Difficulty Tracker</h2>
            <p className="text-slate-500">Hover over fixtures to see opponent threats & stats</p>
          </div>
          <div className="flex items-center gap-4">
            <select value={numWeeks} onChange={e => setNumWeeks(parseInt(e.target.value))} className="px-3 py-2 bg-white border border-slate-200 rounded-lg">
              <option value={4}>4 GWs</option>
              <option value={6}>6 GWs</option>
              <option value={8}>8 GWs</option>
              <option value={10}>10 GWs</option>
            </select>
            <select value={sortBy} onChange={e => setSortBy(e.target.value as any)} className="px-3 py-2 bg-white border border-slate-200 rounded-lg">
              <option value="difficulty">Best Fixtures</option>
              <option value="name">Team Name</option>
            </select>
          </div>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap gap-3 mt-6">
          {[1, 2, 3, 4, 5].map(d => (
            <div key={d} className="flex items-center gap-2">
              <div className={`w-8 h-8 rounded ${getFdrClass(d)} flex items-center justify-center text-sm font-bold`}>{d}</div>
              <span className="text-sm text-slate-600">{['Very Easy', 'Easy', 'Medium', 'Hard', 'Very Hard'][d - 1]}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Tips */}
      <div className="grid md:grid-cols-2 gap-4">
        <div className="card p-5 bg-gradient-to-br from-emerald-50 to-green-50 border-emerald-200">
          <h3 className="font-bold text-emerald-800 flex items-center gap-2"><span>🔥</span> Best Fixture Runs</h3>
          <p className="text-sm text-emerald-700 mt-1">Target players from these teams:</p>
          <div className="flex flex-wrap gap-2 mt-3">
            {sortedTeams.slice(0, 5).map(t => (
              <button
                key={t.id}
                type="button"
                onClick={() => onEntityClick?.({ kind: 'team', id: t.id })}
                className="flex items-center gap-2 px-3 py-1.5 bg-white rounded-full border border-emerald-200 hover:border-emerald-300"
              >
                <TeamBadge badge={t.badge} name={t.name} size="sm" />
                <span className="text-sm font-medium text-emerald-800">{t.name}</span>
              </button>
            ))}
          </div>
        </div>
        <div className="card p-5 bg-gradient-to-br from-red-50 to-orange-50 border-red-200">
          <h3 className="font-bold text-red-800 flex items-center gap-2"><span>⚠️</span> Avoid These Teams</h3>
          <p className="text-sm text-red-700 mt-1">Consider selling players from:</p>
          <div className="flex flex-wrap gap-2 mt-3">
            {sortedTeams.slice(-5).reverse().map(t => (
              <button
                key={t.id}
                type="button"
                onClick={() => onEntityClick?.({ kind: 'team', id: t.id })}
                className="flex items-center gap-2 px-3 py-1.5 bg-white rounded-full border border-red-200 hover:border-red-300"
              >
                <TeamBadge badge={t.badge} name={t.name} size="sm" />
                <span className="text-sm font-medium text-red-800">{t.name}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-slate-50">
                <th className="text-left py-4 px-4 font-semibold text-slate-700 sticky left-0 bg-slate-50 z-10 min-w-[200px]">Team</th>
                <th className="text-center py-4 px-3 font-semibold text-slate-700 min-w-[80px]">Avg FDR</th>
                {gameweeks.map(gw => (
                  <th key={gw} className="text-center py-4 px-2 font-semibold text-slate-700 min-w-[60px]">GW{gw}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sortedTeams.map((team, idx) => {
                const avgFdr = teamScores.get(team.id) ?? 3;
                const fdrLabel = getFdrLabel(avgFdr);
                const teamFixtures = data.fixtures.filter(f => f.teamId === team.id);

                return (
                  <tr
                    key={team.id}
                    className={`border-t border-slate-100 transition-colors ${
                      idx < 5 ? 'bg-emerald-50/30' : idx >= sortedTeams.length - 5 ? 'bg-red-50/30' : ''
                    }`}
                  >
                    <td className="py-3 px-4 sticky left-0 bg-white z-10 border-r border-slate-100">
                      <button
                        type="button"
                        onClick={() => onEntityClick?.({ kind: 'team', id: team.id })}
                        className="flex items-center gap-3 text-left hover:text-fpl-forest"
                      >
                        <TeamBadge badge={team.badge} name={team.name} size="lg" />
                        <div>
                          <p className="font-semibold text-slate-800">{team.name}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className={`text-xs font-medium ${team.momentum > 60 ? 'text-emerald-600' : team.momentum < 40 ? 'text-red-600' : 'text-slate-500'}`}>
                              {team.momentum > 60 ? '🔥' : team.momentum < 40 ? '📉' : '➡️'} {team.momentum}% form
                            </span>
                          </div>
                        </div>
                      </button>
                    </td>
                    <td className="py-3 px-3 text-center">
                      <div>
                        <span className="text-xl font-bold text-slate-800">{avgFdr.toFixed(2)}</span>
                        <p className={`text-xs font-medium ${fdrLabel.color}`}>{fdrLabel.label}</p>
                      </div>
                    </td>
                    {gameweeks.map(gw => {
                      const fix = teamFixtures.find(f => f.gameweek === gw);
                      if (!fix) return <td key={gw} className="py-3 px-2 text-center"><div className="w-12 h-12 bg-slate-100 rounded mx-auto" /></td>;
                      
                      return (
                        <td key={gw} className="py-3 px-2 text-center">
                          <div 
                            className={`${getFdrClass(fix.difficulty)} rounded-lg p-1.5 mx-auto w-14 transition-all cursor-pointer hover:scale-110 hover:shadow-lg hover:z-20 relative`}
                            onMouseEnter={(e) => handleCellMouseEnter(fix.opponentId, team.id, fix.isHome, gw, e)}
                            onMouseMove={handleCellMouseMove}
                            onMouseLeave={handleCellMouseLeave}
                            onClick={() => onEntityClick?.({ kind: 'fixture', id: fix.id })}
                          >
                            <p className="font-bold text-sm">{fix.opponent}</p>
                            <p className="text-[10px] opacity-80">{fix.isHome ? 'H' : 'A'}</p>
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Hover card - shows OPPONENT team data */}
      {isHoverVisible && hoverInfo && hoveredOpponentData && hoveredRowTeamData && (
        <div
          className="fixed z-50 bg-white rounded-xl shadow-2xl border border-slate-200 p-5 min-w-[340px] max-w-[400px]"
          style={{ 
            top: Math.max(10, Math.min(hoverInfo.y - 200, window.innerHeight - 480)), 
            left: Math.min(hoverInfo.x + 25, window.innerWidth - 420),
          }}
          onMouseEnter={handleHoverCardEnter}
          onMouseLeave={handleHoverCardLeave}
        >
          {/* Matchup header */}
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
            <button
              type="button"
              onClick={() => onEntityClick?.({ kind: 'team', id: hoveredRowTeamData.id })}
              className="flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-fpl-forest"
            >
              <TeamBadge badge={hoveredRowTeamData.badge} name={hoveredRowTeamData.name} size="sm" />
              <span>{hoveredRowTeamData.shortName}</span>
            </button>
            <div className="px-3 py-1 bg-slate-100 rounded-full">
              <span className="text-xs font-bold text-slate-600">vs</span>
            </div>
            <button
              type="button"
              onClick={() => onEntityClick?.({ kind: 'team', id: hoveredOpponentData.id })}
              className="flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-fpl-forest"
            >
              <span>{hoveredOpponentData.shortName}</span>
              <TeamBadge badge={hoveredOpponentData.badge} name={hoveredOpponentData.name} size="sm" />
            </button>
          </div>

          {/* Opponent header */}
          <button
            type="button"
            onClick={() => onEntityClick?.({ kind: 'team', id: hoveredOpponentData.id })}
            className="flex items-center gap-3 mb-4 text-left hover:text-fpl-forest"
          >
            <TeamBadge badge={hoveredOpponentData.badge} name={hoveredOpponentData.name} size="lg" />
            <div>
              <h4 className="font-bold text-slate-800">{hoveredOpponentData.name}</h4>
              <p className="text-sm text-slate-500">
                {hoveredOpponentData.momentum}% momentum • GW{hoverInfo.gameweek} ({hoverInfo.isHome ? 'H' : 'A'})
              </p>
            </div>
          </button>

          {/* Opponent stats */}
          <div className="grid grid-cols-3 gap-3 mb-4">
            <div className="bg-slate-50 rounded-lg p-2 text-center">
              <p className="text-lg font-bold text-slate-800">{((hoveredOpponentData.stats?.cleanSheetRate ?? 0) * 100).toFixed(0)}%</p>
              <p className="text-xs text-slate-500">CS Rate</p>
            </div>
            <div className="bg-slate-50 rounded-lg p-2 text-center">
              <p className="text-lg font-bold text-slate-800">{(hoveredOpponentData.stats?.goalsPerGame ?? 0).toFixed(1)}</p>
              <p className="text-xs text-slate-500">Goals/Game</p>
            </div>
            <div className="bg-slate-50 rounded-lg p-2 text-center">
              <p className="text-lg font-bold text-slate-800">{(hoveredOpponentData.stats?.concededPerGame ?? 0).toFixed(1)}</p>
              <p className="text-xs text-slate-500">Conc/Game</p>
            </div>
          </div>

          {/* Last 5 form */}
          {hoveredOpponentData.stats?.last5 && (
            <div className="mb-4">
              <p className="text-xs font-semibold text-slate-500 uppercase mb-2">Last 5 Results</p>
              <div className="flex gap-1">
                {hoveredOpponentData.stats.last5.split('').map((r, i) => (
                  <div key={i} className={`w-7 h-7 rounded flex items-center justify-center text-white text-xs font-bold ${
                    r === 'W' ? 'bg-emerald-500' : r === 'D' ? 'bg-amber-400' : 'bg-red-500'
                  }`}>
                    {r}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* What to expect section */}
          <div className="bg-amber-50 rounded-lg p-3 mb-4 border border-amber-100">
            <p className="text-xs font-semibold text-amber-800 uppercase mb-2">⚠️ Threats to {hoveredRowTeamData.shortName}</p>
            <div className="space-y-1.5">
              {hoveredOpponentData.topPlayers?.topAttackers?.slice(0, 2).map(p => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => onEntityClick?.({ kind: 'player', id: p.id })}
                  className="flex w-full items-center justify-between text-left hover:text-amber-900"
                >
                  <div className="flex items-center gap-2">
                    <PlayerPhoto photoCode={p.photoCode} name={p.name} size="sm" />
                    <span className="text-sm font-medium text-amber-900">{p.name}</span>
                  </div>
                  <span className="text-xs text-amber-700">{p.goals}G {p.assists}A • {p.goalOdds}% goal</span>
                </button>
              ))}
            </div>
          </div>

          {/* Clean sheet danger */}
          <div className="bg-red-50 rounded-lg p-3 mb-4 border border-red-100">
            <p className="text-xs font-semibold text-red-800 uppercase mb-2">🛡️ CS Danger for {hoveredRowTeamData.shortName}</p>
            <p className="text-sm text-red-700">
              {hoveredOpponentData.name} score <span className="font-bold">{(hoveredOpponentData.stats?.goalsPerGame ?? 0).toFixed(1)}</span> goals/game
              {(hoveredOpponentData.stats?.goalsPerGame ?? 0) >= 1.5 && 
                <span className="ml-1 text-red-600 font-semibold">— high risk!</span>
              }
            </p>
          </div>

          {/* Opponent's star players */}
          {hoveredOpponentData.topPlayers?.starPlayers?.length > 0 && (
            <div className="mb-4">
              <p className="text-xs font-semibold text-slate-500 uppercase mb-2">⭐ {hoveredOpponentData.shortName} Key Players</p>
              <div className="space-y-2">
                {hoveredOpponentData.topPlayers.starPlayers.slice(0, 3).map(p => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => onEntityClick?.({ kind: 'player', id: p.id })}
                    className="flex w-full items-center gap-2 text-left hover:text-fpl-forest"
                  >
                    <PlayerPhoto photoCode={p.photoCode} name={p.name} size="sm" />
                    <div className="flex-1">
                      <p className="font-medium text-slate-800 text-sm">{p.name}</p>
                      <p className="text-xs text-slate-500">{p.position} • {p.points} pts</p>
                    </div>
                    <span className="text-xs font-medium text-fpl-forest">{p.form} form</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Clean sheet assets (opponent's defenders) */}
          {hoveredOpponentData.topPlayers?.topDefenders?.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase mb-2">🧤 {hoveredOpponentData.shortName} CS Assets</p>
              <div className="space-y-2">
                {hoveredOpponentData.topPlayers.topDefenders.slice(0, 2).map(p => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => onEntityClick?.({ kind: 'player', id: p.id })}
                    className="flex w-full items-center gap-2 text-left hover:text-fpl-forest"
                  >
                    <PlayerPhoto photoCode={p.photoCode} name={p.name} size="sm" />
                    <div className="flex-1">
                      <p className="font-medium text-slate-800 text-sm">{p.name}</p>
                      <p className="text-xs text-slate-500">{p.position} • {p.cleanSheets} CS</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
