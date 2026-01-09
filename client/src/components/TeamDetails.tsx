import { useMemo, useState } from 'react';
import { useTeamFixturesData, useTeamInsightsData } from '../hooks/useDrawerData';
import type { EntityRef } from '../types';
import { ErrorMessage, Loading, PlayerPhoto, TeamBadge } from './ui';
import { StatsSection } from './StatsSection';

type TabKey = 'overview' | 'attack' | 'defence';

export function TeamDetails({
  teamId,
  isActive,
  onEntityClick,
}: {
  teamId: number;
  isActive: boolean;
  onEntityClick: (ref: EntityRef) => void;
}) {
  const [activeTab, setActiveTab] = useState<TabKey>('overview');
  const { data, loading, error } = useTeamFixturesData(isActive);
  const { data: insights } = useTeamInsightsData(teamId, isActive, 5);

  const team = data?.teams.find(t => t.id === teamId);
  const fixtures = useMemo(() => {
    if (!data) return [];
    return data.fixtures.filter(f => f.teamId === teamId).sort((a, b) => a.gameweek - b.gameweek).slice(0, 5);
  }, [data, teamId]);

  if (loading) return <Loading message="Loading team..." />;
  if (error) return <ErrorMessage message={error} />;
  if (!team) return null;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3 pb-3 border-b border-slate-700">
        <TeamBadge badge={team.badge} name={team.name} size="lg" />
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-slate-100">{team.name}</h3>
          <p className="text-xs text-slate-500">{team.momentum}% momentum</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-700">
        {[
          { key: 'overview', label: 'Overview' },
          { key: 'attack', label: 'Attack' },
          { key: 'defence', label: 'Defence' },
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
          <StatsSection title="Strength">
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-slate-800/50 border border-slate-700 rounded p-2 text-center">
                <p className="text-[10px] uppercase tracking-wide text-slate-500">Attack</p>
                <p className="text-lg font-semibold text-slate-100 tabular-nums">{insights?.attackIndex.toFixed(2) ?? '-'}</p>
              </div>
              <div className="bg-slate-800/50 border border-slate-700 rounded p-2 text-center">
                <p className="text-[10px] uppercase tracking-wide text-slate-500">Defence</p>
                <p className="text-lg font-semibold text-slate-100 tabular-nums">{insights?.defenceIndex.toFixed(2) ?? '-'}</p>
              </div>
            </div>
          </StatsSection>

          <StatsSection title="Form">
            <div className="grid grid-cols-3 gap-2">
              <div className="bg-slate-800/50 border border-slate-700 rounded p-2 text-center">
                <p className="text-[10px] uppercase tracking-wide text-slate-500">G/Game</p>
                <p className="text-lg font-semibold text-slate-100 tabular-nums">{team.stats?.goalsPerGame?.toFixed(1)}</p>
              </div>
              <div className="bg-slate-800/50 border border-slate-700 rounded p-2 text-center">
                <p className="text-[10px] uppercase tracking-wide text-slate-500">Conc/G</p>
                <p className="text-lg font-semibold text-slate-100 tabular-nums">{team.stats?.concededPerGame?.toFixed(1)}</p>
              </div>
              <div className="bg-slate-800/50 border border-slate-700 rounded p-2 text-center">
                <p className="text-[10px] uppercase tracking-wide text-slate-500">CS%</p>
                <p className="text-lg font-semibold text-slate-100 tabular-nums">
                  {((team.stats?.cleanSheetRate ?? 0) * 100).toFixed(0)}%
                </p>
              </div>
            </div>
          </StatsSection>

          <StatsSection title="Fixtures">
            <div className="space-y-1">
              {fixtures.length === 0 && <p className="text-sm text-slate-500">Coming soon</p>}
              {fixtures.map(fixture => (
                <button
                  key={`${fixture.id}-${fixture.gameweek}`}
                  type="button"
                  onClick={() => onEntityClick({ kind: 'fixture', id: fixture.id })}
                  className="w-full bg-slate-800/50 border border-slate-700 rounded px-3 py-2 text-left text-sm text-slate-300 hover:border-emerald-500/40 transition-colors"
                >
                  <span className="text-slate-500">GW{fixture.gameweek}</span> {fixture.isHome ? 'vs' : '@'} {fixture.opponent}
                </button>
              ))}
            </div>
            {insights?.fixtures?.length ? (
              <div className="mt-2 bg-slate-800/30 border border-slate-700/50 rounded p-2 text-xs text-slate-400">
                CS outlook: <span className="text-slate-200 font-medium">{insights.upcomingCsChance.toFixed(0)}%</span> | xG: <span className="text-slate-200 font-medium">{insights.impliedGoalsNext.toFixed(2)}</span>
              </div>
            ) : null}
          </StatsSection>
        </div>
      )}

      {activeTab === 'attack' && (
        <div className="space-y-4">
          <StatsSection title="Attack Stats">
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-slate-800/50 border border-slate-700 rounded p-2 text-center">
                <p className="text-[10px] uppercase tracking-wide text-slate-500">G/Game</p>
                <p className="text-lg font-semibold text-slate-100 tabular-nums">{team.stats?.goalsPerGame?.toFixed(1)}</p>
              </div>
              <div className="bg-slate-800/50 border border-slate-700 rounded p-2 text-center">
                <p className="text-[10px] uppercase tracking-wide text-slate-500">Index</p>
                <p className="text-lg font-semibold text-emerald-400 tabular-nums">{insights?.attackIndex.toFixed(2) ?? '-'}</p>
              </div>
            </div>
          </StatsSection>

          <StatsSection title="Top Attackers">
            <div className="space-y-1">
              {(team.topPlayers?.topAttackers ?? []).map(player => (
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
                  <div className="text-right text-xs">
                    <span className="text-emerald-400">{player.goals}G</span>
                    <span className="text-slate-500 mx-1">|</span>
                    <span className="text-slate-300">{player.assists}A</span>
                  </div>
                </button>
              ))}
              {(team.topPlayers?.topAttackers ?? []).length === 0 && (
                <p className="text-sm text-slate-500">No data</p>
              )}
            </div>
          </StatsSection>
        </div>
      )}

      {activeTab === 'defence' && (
        <div className="space-y-4">
          <StatsSection title="Defence Stats">
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-slate-800/50 border border-slate-700 rounded p-2 text-center">
                <p className="text-[10px] uppercase tracking-wide text-slate-500">Conc/G</p>
                <p className="text-lg font-semibold text-slate-100 tabular-nums">{team.stats?.concededPerGame?.toFixed(1)}</p>
              </div>
              <div className="bg-slate-800/50 border border-slate-700 rounded p-2 text-center">
                <p className="text-[10px] uppercase tracking-wide text-slate-500">CS%</p>
                <p className="text-lg font-semibold text-emerald-400 tabular-nums">
                  {((team.stats?.cleanSheetRate ?? 0) * 100).toFixed(0)}%
                </p>
              </div>
            </div>
          </StatsSection>

          <StatsSection title="Top Defenders">
            <div className="space-y-1">
              {(team.topPlayers?.topDefenders ?? []).map(player => (
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
                  <div className="text-right text-xs text-emerald-400">
                    {player.cleanSheets} CS
                  </div>
                </button>
              ))}
              {(team.topPlayers?.topDefenders ?? []).length === 0 && (
                <p className="text-sm text-slate-500">No data</p>
              )}
            </div>
          </StatsSection>
        </div>
      )}
    </div>
  );
}
