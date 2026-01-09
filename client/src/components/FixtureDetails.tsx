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
          <StatsSection title="Match Outlook">
            <div className="grid grid-cols-2 gap-3 text-center">
              <div className="rounded-lg bg-slate-50 p-3">
                <p className="text-xs text-slate-500">{homeTeam.shortName} xG</p>
                <p className="text-lg font-semibold text-slate-800">{(insights?.homeXG ?? 0).toFixed(2)}</p>
              </div>
              <div className="rounded-lg bg-slate-50 p-3">
                <p className="text-xs text-slate-500">{awayTeam.shortName} xG</p>
                <p className="text-lg font-semibold text-slate-800">{(insights?.awayXG ?? 0).toFixed(2)}</p>
              </div>
            </div>
            {insights?.estimated && <p className="text-xs text-slate-400 mt-2">Estimated from strength + FDR</p>}
          </StatsSection>
          <StatsSection title="Clean Sheet Outlook">
            <p className="text-sm text-slate-600">
              {homeTeam.shortName} CS chance: <span className="font-semibold">{(insights?.homeCS ?? homeEntry.csChance ?? 0).toFixed(0)}%</span>
            </p>
            <p className="text-sm text-slate-600 mt-1">
              {awayTeam.shortName} CS chance: <span className="font-semibold">{(insights?.awayCS ?? awayEntry.csChance ?? 0).toFixed(0)}%</span>
            </p>
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
                <p className="text-xs text-slate-400 mt-1">Attack {insights?.attackIndex.home.toFixed(2) ?? '—'}</p>
                <p className="text-xs text-slate-400">Defence {insights?.defenceIndex.home.toFixed(2) ?? '—'}</p>
              </div>
              <div>
                <p className="text-xs uppercase text-slate-400">{awayTeam.shortName}</p>
                <p className="text-lg font-semibold text-slate-800">{awayTeam.stats?.goalsPerGame?.toFixed(1)} G/G</p>
                <p className="text-sm text-slate-500">{awayTeam.stats?.concededPerGame?.toFixed(1)} conceded</p>
                <p className="text-sm text-slate-500">{((awayTeam.stats?.cleanSheetRate ?? 0) * 100).toFixed(0)}% CS</p>
                <p className="text-xs text-slate-400 mt-1">Attack {insights?.attackIndex.away.toFixed(2) ?? '—'}</p>
                <p className="text-xs text-slate-400">Defence {insights?.defenceIndex.away.toFixed(2) ?? '—'}</p>
              </div>
            </div>
            <p className="text-xs text-slate-500 mt-3">Attack/defence indices are normalized vs league average.</p>
          </StatsSection>
        </div>
      )}

      {activeTab === 'players' && (
        <div className="space-y-4">
          <StatsSection title={`${homeTeam.shortName} Key Players`}>
            <div className="space-y-2">
              {(insights?.homeKeyPlayers ?? homeTeam.topPlayers?.starPlayers ?? []).map(player => (
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
                  {'xPts' in player ? (
                    <span className="text-xs text-slate-500">{player.xPts.toFixed(1)} xPts</span>
                  ) : (
                    <span className="text-xs text-slate-500">{player.points} pts</span>
                  )}
                </button>
              ))}
              {(insights?.homeKeyPlayers ?? homeTeam.topPlayers?.starPlayers ?? []).length === 0 && (
                <p className="text-sm text-slate-500">Coming soon</p>
              )}
            </div>
          </StatsSection>

          <StatsSection title={`${awayTeam.shortName} Key Players`}>
            <div className="space-y-2">
              {(insights?.awayKeyPlayers ?? awayTeam.topPlayers?.starPlayers ?? []).map(player => (
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
                  {'xPts' in player ? (
                    <span className="text-xs text-slate-500">{player.xPts.toFixed(1)} xPts</span>
                  ) : (
                    <span className="text-xs text-slate-500">{player.points} pts</span>
                  )}
                </button>
              ))}
              {(insights?.awayKeyPlayers ?? awayTeam.topPlayers?.starPlayers ?? []).length === 0 && (
                <p className="text-sm text-slate-500">Coming soon</p>
              )}
            </div>
          </StatsSection>
        </div>
      )}
    </div>
  );
}
