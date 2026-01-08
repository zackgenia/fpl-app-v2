import { useMemo, useState } from 'react';
import { usePlayerDetailData } from '../hooks/useDrawerData';
import { usePlayerMetrics } from '../hooks/useMetrics';
import type { EntityRef } from '../types';
import { ErrorMessage, FdrChip, Loading, PlayerPhoto, TeamBadge } from './ui';
import { StatsSection } from './StatsSection';

type TabKey = 'overview' | 'minutes' | 'stats';

export function PlayerDetails({
  playerId,
  isActive,
  onEntityClick,
}: {
  playerId: number;
  isActive: boolean;
  onEntityClick: (ref: EntityRef) => void;
}) {
  const [activeTab, setActiveTab] = useState<TabKey>('overview');
  const { data, loading, error } = usePlayerDetailData(playerId, isActive);
  const { data: metrics } = usePlayerMetrics(playerId, isActive);

  const player = data?.player;
  const positionLabel = player?.position ?? 'MID';
  const advanced = metrics?.advanced;

  const fixtureList = useMemo(() => {
    if (!player?.nextFixtures) return [];
    return player.nextFixtures.slice(0, 5);
  }, [player?.nextFixtures]);

  if (loading) return <Loading message="Loading player..." />;
  if (error) return <ErrorMessage message={error} />;
  if (!player) return null;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <PlayerPhoto photoCode={player.photoCode} name={player.webName} size="lg" />
        <div className="flex-1">
          <p className="text-sm text-slate-500">Player</p>
          <h3 className="text-xl font-bold text-slate-800">{player.webName}</h3>
          <div className="flex items-center gap-2 mt-1">
            <button
              type="button"
              onClick={() => onEntityClick({ kind: 'team', id: player.teamId })}
              className="flex items-center gap-2 text-sm text-slate-600 hover:text-fpl-forest"
            >
              <TeamBadge badge={player.teamBadge} name={player.teamShortName} size="sm" />
              <span>{player.teamShortName}</span>
            </button>
            <span className="text-xs text-slate-400">•</span>
            <span className="text-sm text-slate-600">{player.position}</span>
            <span className="text-xs text-slate-400">•</span>
            <span className="text-sm font-medium text-slate-700">£{(player.cost / 10).toFixed(1)}m</span>
          </div>
        </div>
        <div className="text-right">
          <p className="text-xs text-slate-500">Predicted</p>
          <p className="text-lg font-bold text-emerald-600">{player.predictedPointsN.toFixed(1)} pts</p>
        </div>
      </div>

      <div className="flex gap-1 rounded-xl bg-slate-100 p-1">
        {[
          { key: 'overview', label: 'Overview' },
          { key: 'minutes', label: 'Role & Minutes' },
          { key: 'stats', label: positionLabel === 'GK' ? 'Goalkeeping' : positionLabel === 'DEF' ? 'Defending' : 'Attacking' },
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
          <StatsSection title="Season Snapshot">
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="rounded-lg bg-slate-50 p-2">
                <p className="text-xs text-slate-500">Points</p>
                <p className="text-lg font-semibold text-slate-800">{player.totalPoints}</p>
              </div>
              <div className="rounded-lg bg-slate-50 p-2">
                <p className="text-xs text-slate-500">Form</p>
                <p className="text-lg font-semibold text-slate-800">{player.form.toFixed(1)}</p>
              </div>
              <div className="rounded-lg bg-slate-50 p-2">
                <p className="text-xs text-slate-500">Ownership</p>
                <p className="text-lg font-semibold text-slate-800">{player.selectedByPercent}%</p>
              </div>
            </div>
          </StatsSection>

          <StatsSection title="Next Fixtures">
            {fixtureList.length === 0 ? (
              <p className="text-sm text-slate-500">Coming soon</p>
            ) : (
              <div className="flex items-center gap-2 flex-wrap">
                {fixtureList.map((fixture, idx) => (
                  <FdrChip key={`${fixture.opponent}-${idx}`} difficulty={fixture.difficulty} opponent={fixture.opponent} isHome={fixture.isHome} size="md" />
                ))}
              </div>
            )}
          </StatsSection>
        </div>
      )}

      {activeTab === 'minutes' && (
        <div className="space-y-4">
          <StatsSection title="Role & Minutes">
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-lg bg-slate-50 p-3">
                <p className="text-xs text-slate-500">Minutes %</p>
                <p className="text-lg font-semibold text-slate-800">{player.minutesPct}%</p>
              </div>
              <div className="rounded-lg bg-slate-50 p-3">
                <p className="text-xs text-slate-500">Minutes Risk</p>
                <p className="text-lg font-semibold text-slate-800">{player.minutesRisk}%</p>
              </div>
            </div>
            <div className="mt-3 rounded-lg bg-amber-50 border border-amber-100 p-3 text-sm text-amber-800">
              Role trends and rotation notes coming soon.
            </div>
          </StatsSection>

          <StatsSection title="Availability">
            <p className="text-sm text-slate-600">
              Status: <span className="font-semibold">{player.status.toUpperCase()}</span>{' '}
              {player.chanceOfPlaying !== null && (
                <span className="text-slate-500">• {player.chanceOfPlaying}% chance to play</span>
              )}
            </p>
          </StatsSection>
        </div>
      )}

      {activeTab === 'stats' && (
        <div className="space-y-4">
          {positionLabel === 'GK' && (
            <StatsSection title="Goalkeeping Output">
              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="rounded-lg bg-slate-50 p-2">
                  <p className="text-xs text-slate-500">Clean Sheets</p>
                  <p className="text-lg font-semibold text-slate-800">{player.cleanSheets}</p>
                </div>
                <div className="rounded-lg bg-slate-50 p-2">
                  <p className="text-xs text-slate-500">Bonus</p>
                  <p className="text-lg font-semibold text-slate-800">{player.bonus}</p>
                </div>
                <div className="rounded-lg bg-slate-50 p-2">
                  <p className="text-xs text-slate-500">ICT</p>
                  <p className="text-lg font-semibold text-slate-800">{player.ictIndex}</p>
                </div>
              </div>
              <p className="text-xs text-slate-500 mt-3">Advanced save metrics coming soon.</p>
            </StatsSection>
          )}

          {positionLabel === 'DEF' && (
            <StatsSection title="Defensive Output">
              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="rounded-lg bg-slate-50 p-2">
                  <p className="text-xs text-slate-500">Clean Sheets</p>
                  <p className="text-lg font-semibold text-slate-800">{player.cleanSheets}</p>
                </div>
                <div className="rounded-lg bg-slate-50 p-2">
                  <p className="text-xs text-slate-500">Goals</p>
                  <p className="text-lg font-semibold text-slate-800">{player.goalsScored}</p>
                </div>
                <div className="rounded-lg bg-slate-50 p-2">
                  <p className="text-xs text-slate-500">Assists</p>
                  <p className="text-lg font-semibold text-slate-800">{player.assists}</p>
                </div>
              </div>
              <p className="text-xs text-slate-500 mt-3">Expected clean sheet data coming soon.</p>
            </StatsSection>
          )}

          {(positionLabel === 'MID' || positionLabel === 'FWD') && (
            <StatsSection title="Attacking Output">
              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="rounded-lg bg-slate-50 p-2">
                  <p className="text-xs text-slate-500">Goals</p>
                  <p className="text-lg font-semibold text-slate-800">{player.goalsScored}</p>
                </div>
                <div className="rounded-lg bg-slate-50 p-2">
                  <p className="text-xs text-slate-500">Assists</p>
                  <p className="text-lg font-semibold text-slate-800">{player.assists}</p>
                </div>
                <div className="rounded-lg bg-slate-50 p-2">
                  <p className="text-xs text-slate-500">xGI</p>
                  <p className="text-lg font-semibold text-slate-800">{player.expectedGoalInvolvements}</p>
                </div>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-3 text-center">
                <div className="rounded-lg bg-slate-50 p-2">
                  <p className="text-xs text-slate-500">xG</p>
                  <p className="text-lg font-semibold text-slate-800">{player.expectedGoals}</p>
                </div>
                <div className="rounded-lg bg-slate-50 p-2">
                  <p className="text-xs text-slate-500">xA</p>
                  <p className="text-lg font-semibold text-slate-800">{player.expectedAssists}</p>
                </div>
              </div>
              <p className="text-xs text-slate-500 mt-3">Shot quality breakdown coming soon.</p>
            </StatsSection>
          )}

          <StatsSection title="Advanced Metrics">
            {advanced ? (
              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="rounded-lg bg-slate-50 p-2">
                  <p className="text-xs text-slate-500">xG</p>
                  <p className="text-lg font-semibold text-slate-800">{advanced.xG ?? '—'}</p>
                </div>
                <div className="rounded-lg bg-slate-50 p-2">
                  <p className="text-xs text-slate-500">xA</p>
                  <p className="text-lg font-semibold text-slate-800">{advanced.xA ?? '—'}</p>
                </div>
                <div className="rounded-lg bg-slate-50 p-2">
                  <p className="text-xs text-slate-500">xGI</p>
                  <p className="text-lg font-semibold text-slate-800">{advanced.xGI ?? '—'}</p>
                </div>
              </div>
            ) : (
              <p className="text-sm text-slate-500">Coming soon</p>
            )}
          </StatsSection>
        </div>
      )}
    </div>
  );
}
