import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { getTeamFixtures } from '../api';
import { Loading, ErrorMessage, TeamBadge, PlayerPhoto } from '../components';
import { getFixtureStatus, type RawFixture } from '../utils/fixtureStatus';
import type { EntityRef, TeamFixtureData, Fixture } from '../types';

interface HoverInfo {
  opponentId: number;
  rowTeamId: number;
  isHome: boolean;
  gameweek: number;
  fixtureId: number;
  x: number;
  y: number;
}

interface LiveScoreTooltipInfo {
  fixtureId: number;
  x: number;
  y: number;
}

interface Props {
  onEntityClick?: (entity: EntityRef) => void;
}

export function FixtureTracker({ onEntityClick }: Props) {
  const [data, setData] = useState<{ teams: TeamFixtureData[]; fixtures: Fixture[]; currentGameweek: number } | null>(null);
  const [liveFixtures, setLiveFixtures] = useState<RawFixture[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [numWeeks, setNumWeeks] = useState(6);
  const [sortBy, setSortBy] = useState<'name' | 'difficulty'>('difficulty');

  const [hoverInfo, setHoverInfo] = useState<HoverInfo | null>(null);
  const [isHoverVisible, setIsHoverVisible] = useState(false);
  const [liveTooltip, setLiveTooltip] = useState<LiveScoreTooltipInfo | null>(null);

  const hoverEnterTimer = useRef<NodeJS.Timeout | null>(null);
  const hoverLeaveTimer = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      try {
        const [result, rawFixtures] = await Promise.all([
          getTeamFixtures(numWeeks),
          fetch('/api/fpl/fixtures').then(r => r.json()).catch(() => []),
        ]);
        setData(result);
        setLiveFixtures(Array.isArray(rawFixtures) ? rawFixtures : []);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load');
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [numWeeks]);

  // Poll for live fixture updates (every 30s)
  useEffect(() => {
    const hasLive = liveFixtures.some(f => f.started && !f.finished);
    if (!hasLive) return;

    const interval = setInterval(async () => {
      try {
        const rawFixtures = await fetch('/api/fpl/fixtures').then(r => r.json());
        if (Array.isArray(rawFixtures)) {
          setLiveFixtures(rawFixtures);
        }
      } catch {}
    }, 30000);

    return () => clearInterval(interval);
  }, [liveFixtures]);

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

  const teamsById = useMemo(() => {
    if (!data) return new Map<number, TeamFixtureData>();
    return new Map(data.teams.map(t => [t.id, t]));
  }, [data]);

  // Memoized live fixture lookup
  const liveFixtureMap = useMemo(() => {
    return new Map(liveFixtures.map(f => [f.id, f]));
  }, [liveFixtures]);

  const handleCellMouseEnter = useCallback((
    opponentId: number,
    rowTeamId: number,
    isHome: boolean,
    gameweek: number,
    fixtureId: number,
    e: React.MouseEvent
  ) => {
    if (hoverLeaveTimer.current) {
      clearTimeout(hoverLeaveTimer.current);
      hoverLeaveTimer.current = null;
    }

    const newHoverInfo: HoverInfo = { opponentId, rowTeamId, isHome, gameweek, fixtureId, x: e.clientX, y: e.clientY };

    // Set live tooltip if fixture is live
    const liveFix = liveFixtureMap.get(fixtureId);
    if (liveFix && liveFix.started && !liveFix.finished) {
      setLiveTooltip({ fixtureId, x: e.clientX, y: e.clientY });
    } else {
      setLiveTooltip(null);
    }

    if (isHoverVisible) {
      setHoverInfo(newHoverInfo);
    } else {
      setHoverInfo(newHoverInfo);
      if (hoverEnterTimer.current) clearTimeout(hoverEnterTimer.current);
      hoverEnterTimer.current = setTimeout(() => setIsHoverVisible(true), 120);
    }
  }, [isHoverVisible, liveFixtureMap]);

  const handleCellMouseMove = useCallback((e: React.MouseEvent) => {
    if (hoverInfo) {
      setHoverInfo(prev => prev ? { ...prev, x: e.clientX, y: e.clientY } : null);
    }
  }, [hoverInfo]);

  const handleCellMouseLeave = useCallback(() => {
    if (hoverEnterTimer.current) {
      clearTimeout(hoverEnterTimer.current);
      hoverEnterTimer.current = null;
    }
    setLiveTooltip(null);
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
    if (avg <= 2) return { label: 'Excellent', color: 'text-emerald-400' };
    if (avg <= 2.5) return { label: 'Good', color: 'text-green-400' };
    if (avg <= 3) return { label: 'Average', color: 'text-amber-400' };
    if (avg <= 3.5) return { label: 'Tough', color: 'text-orange-400' };
    return { label: 'Very Hard', color: 'text-red-400' };
  };

  if (loading) return <Loading message="Loading fixture data..." />;
  if (error) return <ErrorMessage message={error} />;
  if (!data) return null;

  const hoveredOpponentData = hoverInfo ? teamsById.get(hoverInfo.opponentId) : null;
  const hoveredRowTeamData = hoverInfo ? teamsById.get(hoverInfo.rowTeamId) : null;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-slate-100">Fixture Difficulty</h2>
          <p className="text-sm text-slate-500">Hover fixtures for opponent analysis</p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={numWeeks}
            onChange={e => setNumWeeks(parseInt(e.target.value))}
            className="bg-slate-800 border border-slate-700 text-slate-200 rounded px-2 py-1 text-sm"
          >
            <option value={4}>4 GW</option>
            <option value={6}>6 GW</option>
            <option value={8}>8 GW</option>
            <option value={10}>10 GW</option>
          </select>
          <select
            value={sortBy}
            onChange={e => setSortBy(e.target.value as 'name' | 'difficulty')}
            className="bg-slate-800 border border-slate-700 text-slate-200 rounded px-2 py-1 text-sm"
          >
            <option value="difficulty">Best Fixtures</option>
            <option value="name">Team Name</option>
          </select>
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-2">
        {[1, 2, 3, 4, 5].map(d => (
          <div key={d} className="flex items-center gap-1.5">
            <div className={`w-6 h-6 rounded-sm ${getFdrClass(d)} flex items-center justify-center text-xs font-bold`}>{d}</div>
            <span className="text-xs text-slate-500">{['Easy', 'Fair', 'Med', 'Hard', 'Tough'][d - 1]}</span>
          </div>
        ))}
      </div>

      {/* Quick Picks */}
      <div className="grid md:grid-cols-2 gap-3">
        <div className="bg-emerald-500/10 border border-emerald-500/20 rounded p-3">
          <h3 className="font-medium text-emerald-400 text-sm mb-2">Best Fixture Runs</h3>
          <div className="flex flex-wrap gap-1.5">
            {sortedTeams.slice(0, 5).map(t => (
              <button
                key={t.id}
                type="button"
                onClick={() => onEntityClick?.({ kind: 'team', id: t.id })}
                className="flex items-center gap-1.5 px-2 py-1 bg-slate-800 rounded border border-slate-700 hover:border-emerald-500/40 transition-colors"
              >
                <TeamBadge badge={t.badge} name={t.name} size="sm" />
                <span className="text-xs font-medium text-slate-300">{t.shortName}</span>
              </button>
            ))}
          </div>
        </div>
        <div className="bg-red-500/10 border border-red-500/20 rounded p-3">
          <h3 className="font-medium text-red-400 text-sm mb-2">Tough Fixtures Ahead</h3>
          <div className="flex flex-wrap gap-1.5">
            {sortedTeams.slice(-5).reverse().map(t => (
              <button
                key={t.id}
                type="button"
                onClick={() => onEntityClick?.({ kind: 'team', id: t.id })}
                className="flex items-center gap-1.5 px-2 py-1 bg-slate-800 rounded border border-slate-700 hover:border-red-500/40 transition-colors"
              >
                <TeamBadge badge={t.badge} name={t.name} size="sm" />
                <span className="text-xs font-medium text-slate-300">{t.shortName}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-slate-800 border border-slate-700 rounded overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-700 text-xs uppercase text-slate-500">
                <th className="text-left py-2 px-3 font-medium sticky left-0 bg-slate-800 z-10 min-w-[160px]">Team</th>
                <th className="text-center py-2 px-2 font-medium min-w-[60px]">Avg</th>
                {gameweeks.map(gw => (
                  <th key={gw} className="text-center py-2 px-1 font-medium min-w-[48px]">GW{gw}</th>
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
                    className={`border-b border-slate-800 hover:bg-slate-700/30 transition-colors ${
                      idx < 5 ? 'bg-emerald-500/5' : idx >= sortedTeams.length - 5 ? 'bg-red-500/5' : idx % 2 === 0 ? 'bg-slate-800/30' : ''
                    }`}
                  >
                    <td className="py-2 px-3 sticky left-0 bg-slate-800 z-10 border-r border-slate-700">
                      <button
                        type="button"
                        onClick={() => onEntityClick?.({ kind: 'team', id: team.id })}
                        className="flex items-center gap-2 text-left hover:text-emerald-400 transition-colors"
                      >
                        <TeamBadge badge={team.badge} name={team.name} size="sm" />
                        <div>
                          <p className="font-medium text-slate-200 text-xs">{team.shortName}</p>
                          <p className={`text-[10px] ${team.momentum > 60 ? 'text-emerald-400' : team.momentum < 40 ? 'text-red-400' : 'text-slate-500'}`}>
                            {team.momentum}%
                          </p>
                        </div>
                      </button>
                    </td>
                    <td className="py-2 px-2 text-center">
                      <span className={`text-sm font-semibold ${fdrLabel.color}`}>{avgFdr.toFixed(1)}</span>
                    </td>
                    {gameweeks.map(gw => {
                      const fix = teamFixtures.find(f => f.gameweek === gw);
                      if (!fix) return <td key={gw} className="py-2 px-1 text-center"><div className="w-10 h-10 bg-slate-700/50 rounded-sm mx-auto" /></td>;

                      // Check if this fixture has a score (finished or live)
                      const liveFix = liveFixtureMap.get(fix.id);
                      const hasScore = liveFix && (liveFix.started || liveFix.finished);
                      const isLive = liveFix && liveFix.started && !liveFix.finished;
                      const homeScore = liveFix?.team_h_score ?? 0;
                      const awayScore = liveFix?.team_a_score ?? 0;
                      const teamScore = fix.isHome ? homeScore : awayScore;
                      const oppScore = fix.isHome ? awayScore : homeScore;

                      return (
                        <td key={gw} className="py-2 px-1 text-center">
                          <div
                            className={`${getFdrClass(fix.difficulty)} rounded-sm p-1 mx-auto w-12 h-12 flex flex-col items-center justify-center cursor-pointer hover:scale-105 hover:ring-1 hover:ring-white/20 transition-all relative ${isLive ? 'ring-1 ring-emerald-500/50' : ''}`}
                            onMouseEnter={(e) => handleCellMouseEnter(fix.opponentId, team.id, fix.isHome, gw, fix.id, e)}
                            onMouseMove={handleCellMouseMove}
                            onMouseLeave={handleCellMouseLeave}
                            onClick={() => onEntityClick?.({ kind: 'fixture', id: fix.id })}
                          >
                            <p className="font-bold text-[11px]">{fix.opponent}</p>
                            {hasScore ? (
                              <p className={`text-[10px] font-bold tabular-nums ${isLive ? 'text-emerald-300' : ''}`}>
                                {teamScore}-{oppScore}
                              </p>
                            ) : (
                              <p className="text-[9px] opacity-75">{fix.isHome ? 'H' : 'A'}</p>
                            )}
                            {isLive && <span className="absolute -top-1 -right-1 w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />}
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

      {/* Hover card - Dark theme */}
      {isHoverVisible && hoverInfo && hoveredOpponentData && hoveredRowTeamData && (
        <div
          className="fixed z-50 bg-slate-800 rounded border border-slate-700 p-4 min-w-[300px] max-w-[360px] shadow-xl"
          style={{
            top: Math.max(10, Math.min(hoverInfo.y - 200, window.innerHeight - 480)),
            left: Math.min(hoverInfo.x + 25, window.innerWidth - 380),
          }}
          onMouseEnter={handleHoverCardEnter}
          onMouseLeave={handleHoverCardLeave}
        >
          {/* Matchup header */}
          <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-700">
            <button
              type="button"
              onClick={() => onEntityClick?.({ kind: 'team', id: hoveredRowTeamData.id })}
              className="flex items-center gap-1.5 text-xs font-medium text-slate-400 hover:text-emerald-400"
            >
              <TeamBadge badge={hoveredRowTeamData.badge} name={hoveredRowTeamData.name} size="sm" />
              <span>{hoveredRowTeamData.shortName}</span>
            </button>
            <span className="text-xs text-slate-600">vs</span>
            <button
              type="button"
              onClick={() => onEntityClick?.({ kind: 'team', id: hoveredOpponentData.id })}
              className="flex items-center gap-1.5 text-xs font-medium text-slate-400 hover:text-emerald-400"
            >
              <span>{hoveredOpponentData.shortName}</span>
              <TeamBadge badge={hoveredOpponentData.badge} name={hoveredOpponentData.name} size="sm" />
            </button>
          </div>

          {/* Opponent header */}
          <button
            type="button"
            onClick={() => onEntityClick?.({ kind: 'team', id: hoveredOpponentData.id })}
            className="flex items-center gap-2 mb-3 text-left hover:text-emerald-400"
          >
            <TeamBadge badge={hoveredOpponentData.badge} name={hoveredOpponentData.name} size="md" />
            <div>
              <h4 className="font-semibold text-slate-100 text-sm">{hoveredOpponentData.name}</h4>
              <p className="text-xs text-slate-500">
                {hoveredOpponentData.momentum}% form | GW{hoverInfo.gameweek} ({hoverInfo.isHome ? 'H' : 'A'})
              </p>
            </div>
          </button>

          {/* Opponent stats */}
          <div className="grid grid-cols-3 gap-2 mb-3">
            <div className="bg-slate-700/50 rounded p-2 text-center">
              <p className="text-base font-semibold text-slate-100">{((hoveredOpponentData.stats?.cleanSheetRate ?? 0) * 100).toFixed(0)}%</p>
              <p className="text-[10px] text-slate-500 uppercase">CS Rate</p>
            </div>
            <div className="bg-slate-700/50 rounded p-2 text-center">
              <p className="text-base font-semibold text-slate-100">{(hoveredOpponentData.stats?.goalsPerGame ?? 0).toFixed(1)}</p>
              <p className="text-[10px] text-slate-500 uppercase">G/Game</p>
            </div>
            <div className="bg-slate-700/50 rounded p-2 text-center">
              <p className="text-base font-semibold text-slate-100">{(hoveredOpponentData.stats?.concededPerGame ?? 0).toFixed(1)}</p>
              <p className="text-[10px] text-slate-500 uppercase">Conc/G</p>
            </div>
          </div>

          {/* Last 5 form */}
          {hoveredOpponentData.stats?.last5 && (
            <div className="mb-3">
              <p className="text-[10px] font-medium text-slate-500 uppercase mb-1">Last 5</p>
              <div className="flex gap-0.5">
                {hoveredOpponentData.stats.last5.split('').map((r, i) => (
                  <div key={i} className={`w-5 h-5 rounded-sm flex items-center justify-center text-white text-[10px] font-bold ${
                    r === 'W' ? 'bg-emerald-500' : r === 'D' ? 'bg-amber-500' : 'bg-red-500'
                  }`}>
                    {r}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Threats */}
          <div className="bg-amber-500/10 border border-amber-500/20 rounded p-2 mb-3">
            <p className="text-[10px] font-medium text-amber-400 uppercase mb-1.5">Threats to {hoveredRowTeamData.shortName}</p>
            <div className="space-y-1">
              {hoveredOpponentData.topPlayers?.topAttackers?.slice(0, 2).map(p => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => onEntityClick?.({ kind: 'player', id: p.id })}
                  className="flex w-full items-center justify-between text-left hover:text-amber-300"
                >
                  <div className="flex items-center gap-1.5">
                    <PlayerPhoto photoCode={p.photoCode} name={p.name} size="sm" />
                    <span className="text-xs font-medium text-amber-200">{p.name}</span>
                  </div>
                  <span className="text-[10px] text-amber-400">{p.goals}G {p.assists}A</span>
                </button>
              ))}
            </div>
          </div>

          {/* CS danger */}
          <div className="bg-red-500/10 border border-red-500/20 rounded p-2 mb-3">
            <p className="text-[10px] font-medium text-red-400 uppercase mb-1">CS Risk for {hoveredRowTeamData.shortName}</p>
            <p className="text-xs text-red-300">
              {hoveredOpponentData.name} avg <span className="font-semibold">{(hoveredOpponentData.stats?.goalsPerGame ?? 0).toFixed(1)}</span> G/game
            </p>
          </div>

          {/* Key players */}
          {hoveredOpponentData.topPlayers?.starPlayers?.length > 0 && (
            <div>
              <p className="text-[10px] font-medium text-slate-500 uppercase mb-1.5">{hoveredOpponentData.shortName} Key Players</p>
              <div className="space-y-1">
                {hoveredOpponentData.topPlayers.starPlayers.slice(0, 3).map(p => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => onEntityClick?.({ kind: 'player', id: p.id })}
                    className="flex w-full items-center gap-1.5 text-left hover:text-emerald-400"
                  >
                    <PlayerPhoto photoCode={p.photoCode} name={p.name} size="sm" />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-slate-200 text-xs truncate">{p.name}</p>
                      <p className="text-[10px] text-slate-500">{p.position} | {p.points}pts</p>
                    </div>
                    <span className="text-[10px] font-medium text-emerald-400">{p.form}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Live score tooltip */}
      {liveTooltip && (() => {
        const liveFix = liveFixtureMap.get(liveTooltip.fixtureId);
        if (!liveFix) return null;
        const status = getFixtureStatus(liveFix);
        const homeTeam = teamsById.get(liveFix.team_h);
        const awayTeam = teamsById.get(liveFix.team_a);
        return (
          <div
            className="fixed z-[60] bg-slate-900 border border-emerald-500/50 rounded px-3 py-2 shadow-lg pointer-events-none"
            style={{
              top: liveTooltip.y - 60,
              left: liveTooltip.x + 15,
            }}
          >
            <div className="flex items-center gap-2 text-sm">
              <span className="inline-block w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
              <span className="text-emerald-400 font-semibold text-xs">{status.display}</span>
            </div>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-slate-300 font-medium text-xs">{homeTeam?.shortName ?? 'HOME'}</span>
              <span className="text-emerald-400 font-bold tabular-nums">{status.score?.home ?? 0}</span>
              <span className="text-slate-500">-</span>
              <span className="text-emerald-400 font-bold tabular-nums">{status.score?.away ?? 0}</span>
              <span className="text-slate-300 font-medium text-xs">{awayTeam?.shortName ?? 'AWAY'}</span>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
