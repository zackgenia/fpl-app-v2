import { useMemo, useState } from 'react';
import { useTeamFixturesData } from '../hooks/useDrawerData';
import { useFixtureContext } from '../hooks/useMetrics';
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
  const { data: fixtureContext } = useFixtureContext(fixtureId, isActive);

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
  const homeCs = fixtureContext?.cleanSheetProb?.homeCS ?? homeEntry.csChance;
  const awayCs = fixtureContext?.cleanSheetProb?.awayCS ?? awayEntry.csChance;
  const impliedGoals = fixtureContext?.impliedGoals;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <button
          type="button"
          onClick={() => onEntityClick({ kind: 'team', id: homeTeam.id })}
          className="flex flex-1 items-center gap-3 rounded-xl border border-slate-200 bg-white p-3 hover:border-fpl-forest/40"
        >
          <TeamBadge badge={homeTeam.badge} name={homeTeam.name} size="lg" />
          <div>
            <p className="text-xs text-slate-500">Home</p>
            <p className="font-semibold text-slate-800">{homeTeam.shortName}</p>
          </div>
        </button>
        <div className="text-center text-sm text-slate-500">vs</div>
        <button
          type="button"
          onClick={() => onEntityClick({ kind: 'team', id: awayTeam.id })}
          className="flex flex-1 items-center gap-3 rounded-xl border border-slate-200 bg-white p-3 hover:border-fpl-forest/40"
        >
          <TeamBadge badge={awayTeam.badge} name={awayTeam.name} size="lg" />
          <div>
            <p className="text-xs text-slate-500">Away</p>
            <p className="font-semibold text-slate-800">{awayTeam.shortName}</p>
          </div>
        </button>
      </div>

      <div className="flex gap-1 rounded-xl bg-slate-100 p-1">
        {[
          { key: 'overview', label: 'Overview' },
          { key: 'compare', label: 'Team Compare' },
          { key: 'players', label: 'Key Players' },
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
          <StatsSection title="Fixture Overview">
            <div className="grid grid-cols-2 gap-3 text-center">
              <div className="rounded-lg bg-slate-50 p-3">
                <p className="text-xs text-slate-500">Gameweek</p>
                <p className="text-lg font-semibold text-slate-800">GW{homeEntry.gameweek}</p>
              </div>
              <div className="rounded-lg bg-slate-50 p-3">
                <p className="text-xs text-slate-500">Difficulty</p>
                <p className="text-lg font-semibold text-slate-800">{homeEntry.difficulty} / {awayEntry.difficulty}</p>
              </div>
            </div>
          </StatsSection>
          <StatsSection title="Clean Sheet Outlook">
            <p className="text-sm text-slate-600">
              {homeTeam.shortName} CS chance: <span className="font-semibold">{homeCs?.toFixed(0)}%</span>
            </p>
            <p className="text-sm text-slate-600 mt-1">
              {awayTeam.shortName} CS chance: <span className="font-semibold">{awayCs?.toFixed(0)}%</span>
            </p>
          </StatsSection>
          <StatsSection title="Advanced Probabilities">
            {impliedGoals ? (
              <div className="grid grid-cols-2 gap-3 text-center">
                <div className="rounded-lg bg-slate-50 p-2">
                  <p className="text-xs text-slate-500">{homeTeam.shortName} xG</p>
                  <p className="text-lg font-semibold text-slate-800">{impliedGoals.homeXG ?? '—'}</p>
                </div>
                <div className="rounded-lg bg-slate-50 p-2">
                  <p className="text-xs text-slate-500">{awayTeam.shortName} xG</p>
                  <p className="text-lg font-semibold text-slate-800">{impliedGoals.awayXG ?? '—'}</p>
                </div>
              </div>
            ) : (
              <p className="text-sm text-slate-500">Coming soon</p>
            )}
          </StatsSection>
        </div>
      )}

      {activeTab === 'compare' && (
        <div className="space-y-4">
          <StatsSection title="Team Compare">
            <div className="grid grid-cols-2 gap-4 text-center">
              <div>
                <p className="text-xs uppercase text-slate-400">{homeTeam.shortName}</p>
                <p className="text-lg font-semibold text-slate-800">{homeTeam.stats?.goalsPerGame?.toFixed(1)} G/G</p>
                <p className="text-sm text-slate-500">{homeTeam.stats?.concededPerGame?.toFixed(1)} conceded</p>
                <p className="text-sm text-slate-500">{((homeTeam.stats?.cleanSheetRate ?? 0) * 100).toFixed(0)}% CS</p>
              </div>
              <div>
                <p className="text-xs uppercase text-slate-400">{awayTeam.shortName}</p>
                <p className="text-lg font-semibold text-slate-800">{awayTeam.stats?.goalsPerGame?.toFixed(1)} G/G</p>
                <p className="text-sm text-slate-500">{awayTeam.stats?.concededPerGame?.toFixed(1)} conceded</p>
                <p className="text-sm text-slate-500">{((awayTeam.stats?.cleanSheetRate ?? 0) * 100).toFixed(0)}% CS</p>
              </div>
            </div>
            <p className="text-xs text-slate-500 mt-3">xG matchup stats coming soon.</p>
          </StatsSection>
        </div>
      )}

      {activeTab === 'players' && (
        <div className="space-y-4">
          <StatsSection title={`${homeTeam.shortName} Key Players`}>
            <div className="space-y-2">
              {(homeTeam.topPlayers?.starPlayers ?? []).map(player => (
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
                  <span className="text-xs text-slate-500">{player.points} pts</span>
                </button>
              ))}
              {(homeTeam.topPlayers?.starPlayers ?? []).length === 0 && (
                <p className="text-sm text-slate-500">Coming soon</p>
              )}
            </div>
          </StatsSection>

          <StatsSection title={`${awayTeam.shortName} Key Players`}>
            <div className="space-y-2">
              {(awayTeam.topPlayers?.starPlayers ?? []).map(player => (
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
                  <span className="text-xs text-slate-500">{player.points} pts</span>
                </button>
              ))}
              {(awayTeam.topPlayers?.starPlayers ?? []).length === 0 && (
                <p className="text-sm text-slate-500">Coming soon</p>
              )}
            </div>
          </StatsSection>
        </div>
      )}
    </div>
  );
}
