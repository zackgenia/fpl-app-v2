import { useMemo, useState } from 'react';
import { usePlayerDetailData, usePlayerInsightsData } from '../hooks/useDrawerData';
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
  const { data: insights } = usePlayerInsightsData(playerId, isActive, 5);
  const { data: metrics } = usePlayerMetrics(playerId, isActive);

  const player = data?.player;
  const advanced = metrics?.advanced;
  const positionLabel = player?.position ?? 'MID';

  const fixtureList = useMemo(() => {
    if (!player?.nextFixtures) return [];
    return player.nextFixtures.slice(0, 5);
  }, [player?.nextFixtures]);

  if (loading) return <Loading message="Loading player..." />;
  if (error) return <ErrorMessage message={error} />;
  if (!player) return null;

  const predictedNext5 = insights?.xPts.next5 ?? player.predictedPointsN;
  const predictedNextFixture = insights?.xPts.nextFixture ?? player.predictedPointsN;
  const predictedNext3 = insights?.xPts.next3 ?? player.predictedPointsN;

  return (
    <div className="space-y-4">
      {/* Header - Compact Bloomberg style */}
      <div className="flex items-center gap-3 pb-3 border-b border-slate-700">
        <PlayerPhoto photoCode={player.photoCode} name={player.webName} size="md" />
        <div className="flex-1 min-w-0">
          <h3 className="text-lg font-semibold text-slate-100 truncate">{player.webName}</h3>
          <div className="flex items-center gap-2 text-xs">
            <button
              type="button"
              onClick={() => onEntityClick({ kind: 'team', id: player.teamId })}
              className="flex items-center gap-1.5 text-slate-400 hover:text-emerald-400 transition-colors"
            >
              <TeamBadge badge={player.teamBadge} name={player.teamShortName} size="sm" />
              <span>{player.teamShortName}</span>
            </button>
            <span className="text-slate-600">|</span>
            <span className="text-slate-400">{player.position}</span>
            <span className="text-slate-600">|</span>
            <span className="text-slate-300 font-medium">{(player.cost / 10).toFixed(1)}m</span>
          </div>
        </div>
        <div className="text-right">
          <p className="text-[10px] uppercase tracking-wide text-slate-500">xPts (5GW)</p>
          <p className="text-xl font-semibold text-emerald-400 tabular-nums">{predictedNext5.toFixed(1)}</p>
        </div>
      </div>

      {/* Tabs - Flat with underline */}
      <div className="flex border-b border-slate-700">
        {[
          { key: 'overview', label: 'Overview' },
          { key: 'minutes', label: 'Minutes' },
          { key: 'stats', label: positionLabel === 'GK' ? 'Keeping' : positionLabel === 'DEF' ? 'Defence' : 'Attack' },
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
          {/* Predicted Points */}
          <StatsSection title="Predicted Points">
            <div className="grid grid-cols-3 gap-2">
              <div className="bg-slate-800/50 border border-slate-700 rounded p-2 text-center">
                <p className="text-[10px] uppercase tracking-wide text-slate-500">Next</p>
                <p className="text-lg font-semibold text-slate-100 tabular-nums">{predictedNextFixture.toFixed(1)}</p>
              </div>
              <div className="bg-slate-800/50 border border-slate-700 rounded p-2 text-center">
                <p className="text-[10px] uppercase tracking-wide text-slate-500">3 GW</p>
                <p className="text-lg font-semibold text-slate-100 tabular-nums">{predictedNext3.toFixed(1)}</p>
              </div>
              <div className="bg-slate-800/50 border border-slate-700 rounded p-2 text-center">
                <p className="text-[10px] uppercase tracking-wide text-slate-500">5 GW</p>
                <p className="text-lg font-semibold text-slate-100 tabular-nums">{predictedNext5.toFixed(1)}</p>
              </div>
            </div>
            {insights && (
              <div className="mt-2 bg-slate-800/30 border border-slate-700/50 rounded p-2">
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="text-slate-500">90% Range</span>
                  <span className="font-mono text-slate-300">
                    {insights.xPts.low.toFixed(1)} - {insights.xPts.high.toFixed(1)}
                  </span>
                </div>
                <div className="flex justify-between text-[9px] text-slate-600">
                  <span>10th %ile</span>
                  <span>90th %ile</span>
                </div>
              </div>
            )}
          </StatsSection>

          {/* xPts Breakdown */}
          <StatsSection title="xPts Breakdown">
            <div className="grid grid-cols-5 gap-1.5">
              {[
                { label: 'App', value: insights?.breakdown.appearance ?? 0 },
                { label: 'Goals', value: insights?.breakdown.goals ?? 0 },
                { label: 'Assists', value: insights?.breakdown.assists ?? 0 },
                { label: 'CS', value: insights?.breakdown.cleanSheet ?? 0 },
                { label: 'Bonus', value: insights?.breakdown.bonus ?? 0 },
              ].map(item => (
                <div key={item.label} className="bg-slate-800/50 border border-slate-700 rounded p-2 text-center">
                  <p className="text-[9px] uppercase tracking-wide text-slate-500">{item.label}</p>
                  <p className="text-sm font-semibold text-slate-200 tabular-nums">{item.value.toFixed(1)}</p>
                </div>
              ))}
            </div>
          </StatsSection>

          {/* Season Snapshot */}
          <StatsSection title="Season">
            <div className="grid grid-cols-3 gap-2">
              <div className="bg-slate-800/50 border border-slate-700 rounded p-2 text-center">
                <p className="text-[10px] uppercase tracking-wide text-slate-500">Points</p>
                <p className="text-lg font-semibold text-slate-100 tabular-nums">{player.totalPoints}</p>
              </div>
              <div className="bg-slate-800/50 border border-slate-700 rounded p-2 text-center">
                <p className="text-[10px] uppercase tracking-wide text-slate-500">Form</p>
                <p className="text-lg font-semibold text-slate-100 tabular-nums">{player.form.toFixed(1)}</p>
              </div>
              <div className="bg-slate-800/50 border border-slate-700 rounded p-2 text-center">
                <p className="text-[10px] uppercase tracking-wide text-slate-500">Own%</p>
                <p className="text-lg font-semibold text-slate-100 tabular-nums">{player.selectedByPercent}%</p>
              </div>
            </div>
          </StatsSection>

          {/* Fixtures */}
          <StatsSection title="Fixtures">
            {fixtureList.length === 0 ? (
              <p className="text-sm text-slate-500">Coming soon</p>
            ) : (
              <div className="space-y-2">
                <div className="flex items-center gap-1 flex-wrap">
                  {fixtureList.map((fixture, idx) => (
                    <FdrChip key={`${fixture.opponent}-${idx}`} difficulty={fixture.difficulty} opponent={fixture.opponent} isHome={fixture.isHome} size="sm" />
                  ))}
                </div>
                {insights?.fixtures?.length ? (
                  <div className="flex items-center gap-1 flex-wrap">
                    {insights.fixtures.map(fixture => (
                      <span
                        key={`xpts-${fixture.fixtureId}`}
                        className="bg-slate-700 px-2 py-0.5 rounded text-[10px] font-medium text-slate-300"
                      >
                        {fixture.opponent} {fixture.expectedPoints.toFixed(1)}
                      </span>
                    ))}
                  </div>
                ) : null}
              </div>
            )}
          </StatsSection>
        </div>
      )}

      {activeTab === 'minutes' && (
        <div className="space-y-4">
          <StatsSection title="Role & Minutes">
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-slate-800/50 border border-slate-700 rounded p-3 text-center">
                <p className="text-[10px] uppercase tracking-wide text-slate-500">Minutes %</p>
                <p className="text-xl font-semibold text-slate-100 tabular-nums">{player.minutesPct}%</p>
              </div>
              <div className="bg-slate-800/50 border border-slate-700 rounded p-3 text-center">
                <p className="text-[10px] uppercase tracking-wide text-slate-500">Risk</p>
                <p className="text-xl font-semibold text-slate-100 tabular-nums">{player.minutesRisk}%</p>
              </div>
            </div>
          </StatsSection>

          <StatsSection title="Availability">
            <div className="bg-slate-800/50 border border-slate-700 rounded p-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-400">Status</span>
                <span className={`text-sm font-semibold ${player.status === 'a' ? 'text-emerald-400' : 'text-amber-400'}`}>
                  {player.status.toUpperCase()}
                </span>
              </div>
              {player.chanceOfPlaying !== null && (
                <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-700">
                  <span className="text-sm text-slate-400">Play Chance</span>
                  <span className="text-sm font-semibold text-slate-200">{player.chanceOfPlaying}%</span>
                </div>
              )}
            </div>
          </StatsSection>
        </div>
      )}

      {activeTab === 'stats' && (
        <div className="space-y-4">
          {positionLabel === 'GK' && (
            <StatsSection title="Goalkeeping">
              <div className="grid grid-cols-3 gap-2">
                {[
                  { label: 'CS', value: player.cleanSheets },
                  { label: 'Bonus', value: player.bonus },
                  { label: 'ICT', value: player.ictIndex },
                ].map(item => (
                  <div key={item.label} className="bg-slate-800/50 border border-slate-700 rounded p-2 text-center">
                    <p className="text-[10px] uppercase tracking-wide text-slate-500">{item.label}</p>
                    <p className="text-lg font-semibold text-slate-100 tabular-nums">{item.value}</p>
                  </div>
                ))}
              </div>
            </StatsSection>
          )}

          {positionLabel === 'DEF' && (
            <StatsSection title="Defensive">
              <div className="grid grid-cols-3 gap-2">
                {[
                  { label: 'CS', value: player.cleanSheets },
                  { label: 'Goals', value: player.goalsScored },
                  { label: 'Assists', value: player.assists },
                ].map(item => (
                  <div key={item.label} className="bg-slate-800/50 border border-slate-700 rounded p-2 text-center">
                    <p className="text-[10px] uppercase tracking-wide text-slate-500">{item.label}</p>
                    <p className="text-lg font-semibold text-slate-100 tabular-nums">{item.value}</p>
                  </div>
                ))}
              </div>
            </StatsSection>
          )}

          {(positionLabel === 'MID' || positionLabel === 'FWD') && (
            <StatsSection title="Attacking">
              <div className="grid grid-cols-3 gap-2">
                {[
                  { label: 'Goals', value: player.goalsScored },
                  { label: 'Assists', value: player.assists },
                  { label: 'xGI', value: player.expectedGoalInvolvements },
                ].map(item => (
                  <div key={item.label} className="bg-slate-800/50 border border-slate-700 rounded p-2 text-center">
                    <p className="text-[10px] uppercase tracking-wide text-slate-500">{item.label}</p>
                    <p className="text-lg font-semibold text-slate-100 tabular-nums">{item.value}</p>
                  </div>
                ))}
              </div>
              <div className="mt-2 grid grid-cols-2 gap-2">
                <div className="bg-slate-800/50 border border-slate-700 rounded p-2 text-center">
                  <p className="text-[10px] uppercase tracking-wide text-slate-500">xG</p>
                  <p className="text-lg font-semibold text-slate-100 tabular-nums">{player.expectedGoals}</p>
                </div>
                <div className="bg-slate-800/50 border border-slate-700 rounded p-2 text-center">
                  <p className="text-[10px] uppercase tracking-wide text-slate-500">xA</p>
                  <p className="text-lg font-semibold text-slate-100 tabular-nums">{player.expectedAssists}</p>
                </div>
              </div>
            </StatsSection>
          )}

          <StatsSection title="Advanced">
            <div className="grid grid-cols-4 gap-1.5">
              {[
                { label: 'xG', value: (insights?.advanced.xG ?? 0).toFixed(2) },
                { label: 'xA', value: (insights?.advanced.xA ?? 0).toFixed(2) },
                { label: 'xGI', value: (insights?.advanced.xGI ?? 0).toFixed(2) },
                { label: 'xGI/90', value: (insights?.advanced.xGI90 ?? 0).toFixed(2) },
              ].map(item => (
                <div key={item.label} className="bg-slate-800/50 border border-slate-700 rounded p-2 text-center">
                  <p className="text-[9px] uppercase tracking-wide text-slate-500">{item.label}</p>
                  <p className="text-sm font-semibold text-slate-200 tabular-nums">{item.value}</p>
                </div>
              ))}
            </div>
          </StatsSection>

          {advanced && (advanced.goals !== undefined || advanced.leaguePosition !== undefined) && (
            <StatsSection title="Team Context">
              <div className="grid grid-cols-4 gap-1.5">
                {advanced.leaguePosition !== undefined && (
                  <div className="bg-slate-800/50 border border-slate-700 rounded p-2 text-center">
                    <p className="text-[9px] uppercase tracking-wide text-slate-500">Pos</p>
                    <p className="text-sm font-semibold text-emerald-400 tabular-nums">{advanced.leaguePosition}</p>
                  </div>
                )}
                {advanced.teamPoints !== undefined && (
                  <div className="bg-slate-800/50 border border-slate-700 rounded p-2 text-center">
                    <p className="text-[9px] uppercase tracking-wide text-slate-500">Pts</p>
                    <p className="text-sm font-semibold text-slate-200 tabular-nums">{advanced.teamPoints}</p>
                  </div>
                )}
                {advanced.teamGoalsFor !== undefined && (
                  <div className="bg-slate-800/50 border border-slate-700 rounded p-2 text-center">
                    <p className="text-[9px] uppercase tracking-wide text-slate-500">GF</p>
                    <p className="text-sm font-semibold text-emerald-400 tabular-nums">{advanced.teamGoalsFor}</p>
                  </div>
                )}
                {advanced.teamGoalsAgainst !== undefined && (
                  <div className="bg-slate-800/50 border border-slate-700 rounded p-2 text-center">
                    <p className="text-[9px] uppercase tracking-wide text-slate-500">GA</p>
                    <p className="text-sm font-semibold text-red-400 tabular-nums">{advanced.teamGoalsAgainst}</p>
                  </div>
                )}
              </div>
            </StatsSection>
          )}
        </div>
      )}
    </div>
  );
}
