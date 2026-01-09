import { useMemo, useState } from 'react';
import { useFixtureInsightsData, useTeamFixturesData } from '../hooks/useDrawerData';
import type { EntityRef, Fixture, TeamFixtureData } from '../types';
import { ErrorMessage, Loading, PlayerPhoto, TeamBadge } from './ui';
import { StatsSection } from './StatsSection';

type TabKey = 'overview' | 'compare' | 'players';

type FixturePair = {
  homeEntry: Fixture | null;
  awayEntry: Fixture | null;
  homeTeam: TeamFixtureData | null;
  awayTeam: TeamFixtureData | null;
};

export function FixtureDetails({
  fixtureId,
  isActive,
  onEntityClick,
}: {
  fixtureId: number;
  isActive: boolean;
  onEntityClick: (ref: EntityRef) => void;
}) {
  const [activeTab, setActiveTab] = useState<TabKey>('overview');
  const { data, loading, error } = useTeamFixturesData(isActive);
  const { data: insights } = useFixtureInsightsData(fixtureId, isActive, 5);

  const fixturePair: FixturePair = useMemo(() => {
    if (!data) return { homeEntry: null, awayEntry: null, homeTeam: null, awayTeam: null };
    const entries = data.fixtures.filter(f => f.id === fixtureId);
    const homeEntry = entries.find(f => f.isHome) ?? null;
    const awayEntry = entries.find(f => !f.isHome) ?? null;
    const homeTeam = homeEntry ? data.teams.find(t => t.id === homeEntry.teamId) ?? null : null;
    const awayTeam = awayEntry ? data.teams.find(t => t.id === awayEntry.teamId) ?? null : null;
    return { homeEntry, awayEntry, homeTeam, awayTeam };
  }, [data, fixtureId]);

  if (loading) return <Loading message="Loading fixture..." />;
  if (error) return <ErrorMessage message={error} />;
  if (!fixturePair.homeEntry || !fixturePair.awayEntry || !fixturePair.homeTeam || !fixturePair.awayTeam) return null;

  const { homeEntry, awayEntry, homeTeam, awayTeam } = fixturePair;

  return (
    <div className="space-y-4">
      {/* Teams header */}
      <div className="flex items-center gap-3 pb-3 border-b border-slate-700">
        <button
          type="button"
          onClick={() => onEntityClick({ kind: 'team', id: homeTeam.id })}
          className="flex flex-1 items-center gap-2 bg-slate-800/50 border border-slate-700 rounded p-2 hover:border-emerald-500/40 transition-colors"
        >
          <TeamBadge badge={homeTeam.badge} name={homeTeam.name} size="md" />
          <div className="min-w-0">
            <p className="text-[10px] text-slate-500">HOME</p>
            <p className="font-medium text-slate-200 text-sm truncate">{homeTeam.shortName}</p>
          </div>
        </button>
        <span className="text-slate-600 text-xs">vs</span>
        <button
          type="button"
          onClick={() => onEntityClick({ kind: 'team', id: awayTeam.id })}
          className="flex flex-1 items-center gap-2 bg-slate-800/50 border border-slate-700 rounded p-2 hover:border-emerald-500/40 transition-colors"
        >
          <TeamBadge badge={awayTeam.badge} name={awayTeam.name} size="md" />
          <div className="min-w-0">
            <p className="text-[10px] text-slate-500">AWAY</p>
            <p className="font-medium text-slate-200 text-sm truncate">{awayTeam.shortName}</p>
          </div>
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-700">
        {[
          { key: 'overview', label: 'Overview' },
          { key: 'compare', label: 'Compare' },
          { key: 'players', label: 'Players' },
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as TabKey)}
            className={`px-4 py-2 text-sm font-medium transition-colors relative ${
              activeTab === tab.key ? 'text-emerald-400' : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            {tab.label}
            {activeTab === tab.key && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-400" />
            )}
          </button>
        ))}
      </div>

      {activeTab === 'overview' && (
        <div className="space-y-4">
          <StatsSection title="Match Info">
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-slate-800/50 border border-slate-700 rounded p-2 text-center">
                <p className="text-[10px] uppercase tracking-wide text-slate-500">Gameweek</p>
                <p className="text-lg font-semibold text-slate-100">GW{homeEntry.gameweek}</p>
              </div>
              <div className="bg-slate-800/50 border border-slate-700 rounded p-2 text-center">
                <p className="text-[10px] uppercase tracking-wide text-slate-500">FDR</p>
                <p className="text-lg font-semibold text-slate-100">{homeEntry.difficulty} / {awayEntry.difficulty}</p>
              </div>
            </div>
          </StatsSection>

          <StatsSection title="Expected Goals">
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-slate-800/50 border border-slate-700 rounded p-2 text-center">
                <p className="text-[10px] uppercase tracking-wide text-slate-500">{homeTeam.shortName}</p>
                <p className="text-lg font-semibold text-emerald-400 tabular-nums">{(insights?.homeXG ?? 0).toFixed(2)}</p>
              </div>
              <div className="bg-slate-800/50 border border-slate-700 rounded p-2 text-center">
                <p className="text-[10px] uppercase tracking-wide text-slate-500">{awayTeam.shortName}</p>
                <p className="text-lg font-semibold text-emerald-400 tabular-nums">{(insights?.awayXG ?? 0).toFixed(2)}</p>
              </div>
            </div>
          </StatsSection>

          <StatsSection title="Clean Sheet">
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-slate-800/50 border border-slate-700 rounded p-2 text-center">
                <p className="text-[10px] uppercase tracking-wide text-slate-500">{homeTeam.shortName}</p>
                <p className="text-lg font-semibold text-slate-100 tabular-nums">
                  {(insights?.homeCS ?? homeEntry.csChance ?? 0).toFixed(0)}%
                </p>
              </div>
              <div className="bg-slate-800/50 border border-slate-700 rounded p-2 text-center">
                <p className="text-[10px] uppercase tracking-wide text-slate-500">{awayTeam.shortName}</p>
                <p className="text-lg font-semibold text-slate-100 tabular-nums">
                  {(insights?.awayCS ?? awayEntry.csChance ?? 0).toFixed(0)}%
                </p>
              </div>
            </div>
          </StatsSection>
        </div>
      )}

      {activeTab === 'compare' && (
        <div className="space-y-4">
          <StatsSection title="Team Comparison">
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center space-y-2">
                <p className="text-[10px] uppercase tracking-wide text-slate-500">{homeTeam.shortName}</p>
                <div className="bg-slate-800/50 border border-slate-700 rounded p-2">
                  <p className="text-lg font-semibold text-slate-100 tabular-nums">{homeTeam.stats?.goalsPerGame?.toFixed(1)}</p>
                  <p className="text-[10px] text-slate-500">G/Game</p>
                </div>
                <div className="bg-slate-800/50 border border-slate-700 rounded p-2">
                  <p className="text-lg font-semibold text-slate-100 tabular-nums">{homeTeam.stats?.concededPerGame?.toFixed(1)}</p>
                  <p className="text-[10px] text-slate-500">Conc/G</p>
                </div>
                <div className="bg-slate-800/50 border border-slate-700 rounded p-2">
                  <p className="text-lg font-semibold text-slate-100 tabular-nums">{((homeTeam.stats?.cleanSheetRate ?? 0) * 100).toFixed(0)}%</p>
                  <p className="text-[10px] text-slate-500">CS Rate</p>
                </div>
              </div>
              <div className="text-center space-y-2">
                <p className="text-[10px] uppercase tracking-wide text-slate-500">{awayTeam.shortName}</p>
                <div className="bg-slate-800/50 border border-slate-700 rounded p-2">
                  <p className="text-lg font-semibold text-slate-100 tabular-nums">{awayTeam.stats?.goalsPerGame?.toFixed(1)}</p>
                  <p className="text-[10px] text-slate-500">G/Game</p>
                </div>
                <div className="bg-slate-800/50 border border-slate-700 rounded p-2">
                  <p className="text-lg font-semibold text-slate-100 tabular-nums">{awayTeam.stats?.concededPerGame?.toFixed(1)}</p>
                  <p className="text-[10px] text-slate-500">Conc/G</p>
                </div>
                <div className="bg-slate-800/50 border border-slate-700 rounded p-2">
                  <p className="text-lg font-semibold text-slate-100 tabular-nums">{((awayTeam.stats?.cleanSheetRate ?? 0) * 100).toFixed(0)}%</p>
                  <p className="text-[10px] text-slate-500">CS Rate</p>
                </div>
              </div>
            </div>
          </StatsSection>
        </div>
      )}

      {activeTab === 'players' && (
        <div className="space-y-4">
          <StatsSection title={`${homeTeam.shortName} Key Players`}>
            <div className="space-y-1">
              {(insights?.homeKeyPlayers ?? homeTeam.topPlayers?.starPlayers ?? []).map(player => (
                <button
                  key={player.id}
                  type="button"
                  onClick={() => onEntityClick({ kind: 'player', id: player.id })}
                  className="flex w-full items-center gap-2 bg-slate-800/50 border border-slate-700 rounded px-3 py-2 text-left hover:border-emerald-500/40 transition-colors"
                >
                  <PlayerPhoto photoCode={player.photoCode} name={player.name} size="sm" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-200 truncate">{player.name}</p>
                    <p className="text-[10px] text-slate-500">{player.position}</p>
                  </div>
                  {'xPts' in player ? (
                    <span className="text-xs text-emerald-400 font-medium tabular-nums">{player.xPts.toFixed(1)}</span>
                  ) : (
                    <span className="text-xs text-slate-400 tabular-nums">{player.points}pts</span>
                  )}
                </button>
              ))}
              {(insights?.homeKeyPlayers ?? homeTeam.topPlayers?.starPlayers ?? []).length === 0 && (
                <p className="text-sm text-slate-500">No data</p>
              )}
            </div>
          </StatsSection>

          <StatsSection title={`${awayTeam.shortName} Key Players`}>
            <div className="space-y-1">
              {(insights?.awayKeyPlayers ?? awayTeam.topPlayers?.starPlayers ?? []).map(player => (
                <button
                  key={player.id}
                  type="button"
                  onClick={() => onEntityClick({ kind: 'player', id: player.id })}
                  className="flex w-full items-center gap-2 bg-slate-800/50 border border-slate-700 rounded px-3 py-2 text-left hover:border-emerald-500/40 transition-colors"
                >
                  <PlayerPhoto photoCode={player.photoCode} name={player.name} size="sm" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-200 truncate">{player.name}</p>
                    <p className="text-[10px] text-slate-500">{player.position}</p>
                  </div>
                  {'xPts' in player ? (
                    <span className="text-xs text-emerald-400 font-medium tabular-nums">{player.xPts.toFixed(1)}</span>
                  ) : (
                    <span className="text-xs text-slate-400 tabular-nums">{player.points}pts</span>
                  )}
                </button>
              ))}
              {(insights?.awayKeyPlayers ?? awayTeam.topPlayers?.starPlayers ?? []).length === 0 && (
                <p className="text-sm text-slate-500">No data</p>
              )}
            </div>
          </StatsSection>
        </div>
      )}
    </div>
  );
}
