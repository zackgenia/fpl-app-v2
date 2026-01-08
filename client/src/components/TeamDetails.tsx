import { useMemo, useState } from 'react';
import { useTeamFixturesData } from '../hooks/useDrawerData';
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
      <div className="flex items-center gap-3">
        <TeamBadge badge={team.badge} name={team.name} size="lg" />
        <div>
          <p className="text-sm text-slate-500">Team</p>
          <h3 className="text-xl font-bold text-slate-800">{team.name}</h3>
          <p className="text-sm text-slate-500">{team.momentum}% momentum</p>
        </div>
      </div>

      <div className="flex gap-1 rounded-xl bg-slate-100 p-1">
        {[
          { key: 'overview', label: 'Overview' },
          { key: 'attack', label: 'Attack' },
          { key: 'defence', label: 'Defence' },
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as TabKey)}
            className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium ${
              activeTab === tab.key ? 'bg-white text-fpl-forest shadow' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'overview' && (
        <div className="space-y-4">
          <StatsSection title="Form Snapshot">
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="rounded-lg bg-slate-50 p-2">
                <p className="text-xs text-slate-500">Goals/Game</p>
                <p className="text-lg font-semibold text-slate-800">{team.stats?.goalsPerGame?.toFixed(1)}</p>
              </div>
              <div className="rounded-lg bg-slate-50 p-2">
                <p className="text-xs text-slate-500">Conceded</p>
                <p className="text-lg font-semibold text-slate-800">{team.stats?.concededPerGame?.toFixed(1)}</p>
              </div>
              <div className="rounded-lg bg-slate-50 p-2">
                <p className="text-xs text-slate-500">Clean Sheet</p>
                <p className="text-lg font-semibold text-slate-800">
                  {((team.stats?.cleanSheetRate ?? 0) * 100).toFixed(0)}%
                </p>
              </div>
            </div>
          </StatsSection>

          <StatsSection title="Upcoming Fixtures">
            <div className="space-y-2">
              {fixtures.length === 0 && <p className="text-sm text-slate-500">Coming soon</p>}
              {fixtures.map(fixture => (
                <button
                  key={`${fixture.id}-${fixture.gameweek}`}
                  type="button"
                  onClick={() => onEntityClick({ kind: 'fixture', id: fixture.id })}
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-left text-sm text-slate-700 hover:border-fpl-forest/40"
                >
                  GW{fixture.gameweek} • {fixture.isHome ? 'vs' : '@'} {fixture.opponent}
                </button>
              ))}
            </div>
          </StatsSection>
        </div>
      )}

      {activeTab === 'attack' && (
        <div className="space-y-4">
          <StatsSection title="Team Attack">
            <div className="grid grid-cols-2 gap-3 text-center">
              <div className="rounded-lg bg-slate-50 p-2">
                <p className="text-xs text-slate-500">Goals/Game</p>
                <p className="text-lg font-semibold text-slate-800">{team.stats?.goalsPerGame?.toFixed(1)}</p>
              </div>
              <div className="rounded-lg bg-slate-50 p-2">
                <p className="text-xs text-slate-500">Form</p>
                <p className="text-lg font-semibold text-slate-800">{team.stats?.form?.toFixed(1)}</p>
              </div>
            </div>
            <p className="text-xs text-slate-500 mt-3">Chance creation metrics coming soon.</p>
          </StatsSection>

          <StatsSection title="Top Attackers">
            <div className="space-y-3">
              {(team.topPlayers?.topAttackers ?? []).map(player => (
                <button
                  key={player.id}
                  type="button"
                  onClick={() => onEntityClick({ kind: 'player', id: player.id })}
                  className="flex w-full items-center gap-3 rounded-lg border border-slate-200 bg-white px-3 py-2 text-left hover:border-fpl-forest/40"
                >
                  <PlayerPhoto photoCode={player.photoCode} name={player.name} size="sm" />
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-slate-800">{player.name}</p>
                    <p className="text-xs text-slate-500">{player.position}</p>
                  </div>
                  <div className="text-right text-xs text-slate-500">
                    {player.goals}G • {player.assists}A
                  </div>
                </button>
              ))}
              {(team.topPlayers?.topAttackers ?? []).length === 0 && (
                <p className="text-sm text-slate-500">Coming soon</p>
              )}
            </div>
          </StatsSection>
        </div>
      )}

      {activeTab === 'defence' && (
        <div className="space-y-4">
          <StatsSection title="Defensive Snapshot">
            <div className="grid grid-cols-2 gap-3 text-center">
              <div className="rounded-lg bg-slate-50 p-2">
                <p className="text-xs text-slate-500">Conceded</p>
                <p className="text-lg font-semibold text-slate-800">{team.stats?.concededPerGame?.toFixed(1)}</p>
              </div>
              <div className="rounded-lg bg-slate-50 p-2">
                <p className="text-xs text-slate-500">CS Rate</p>
                <p className="text-lg font-semibold text-slate-800">
                  {((team.stats?.cleanSheetRate ?? 0) * 100).toFixed(0)}%
                </p>
              </div>
            </div>
            <p className="text-xs text-slate-500 mt-3">Expected goals conceded coming soon.</p>
          </StatsSection>

          <StatsSection title="Top Defenders">
            <div className="space-y-3">
              {(team.topPlayers?.topDefenders ?? []).map(player => (
                <button
                  key={player.id}
                  type="button"
                  onClick={() => onEntityClick({ kind: 'player', id: player.id })}
                  className="flex w-full items-center gap-3 rounded-lg border border-slate-200 bg-white px-3 py-2 text-left hover:border-fpl-forest/40"
                >
                  <PlayerPhoto photoCode={player.photoCode} name={player.name} size="sm" />
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-slate-800">{player.name}</p>
                    <p className="text-xs text-slate-500">{player.position}</p>
                  </div>
                  <div className="text-right text-xs text-slate-500">
                    {player.cleanSheets} CS
                  </div>
                </button>
              ))}
              {(team.topPlayers?.topDefenders ?? []).length === 0 && (
                <p className="text-sm text-slate-500">Coming soon</p>
              )}
            </div>
          </StatsSection>
        </div>
      )}
    </div>
  );
}
