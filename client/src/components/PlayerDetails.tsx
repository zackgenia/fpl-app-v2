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
          <p className="text-xs text-slate-500">Predicted (Next 5)</p>
          <p className="text-lg font-bold text-emerald-600">{predictedNext5.toFixed(1)} pts</p>
          {insights?.estimated && <p className="text-[10px] text-slate-400">Estimated</p>}
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
          <StatsSection title="Predicted Points">
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="rounded-lg bg-slate-50 p-2">
                <p className="text-xs text-slate-500">Next Fixture</p>
                <p className="text-lg font-semibold text-slate-800">{predictedNextFixture.toFixed(1)}</p>
              </div>
              <div className="rounded-lg bg-slate-50 p-2">
                <p className="text-xs text-slate-500">Next 3</p>
                <p className="text-lg font-semibold text-slate-800">{predictedNext3.toFixed(1)}</p>
              </div>
              <div className="rounded-lg bg-slate-50 p-2">
                <p className="text-xs text-slate-500">Next 5</p>
                <p className="text-lg font-semibold text-slate-800">{predictedNext5.toFixed(1)}</p>
              </div>
            </div>
            {insights && (
              <div className="mt-3 rounded-lg border border-slate-200 bg-white px-3 py-2">
                <div className="flex items-center justify-between text-xs text-slate-600 mb-2">
                  <span className="font-medium">Confidence Band (90%)</span>
                  <span className="font-semibold text-slate-800">
                    {insights.xPts.low.toFixed(1)} / {predictedNext5.toFixed(1)} / {insights.xPts.high.toFixed(1)}
                  </span>
                </div>
                <div className="flex justify-between text-[10px] text-slate-400 border-t border-slate-100 pt-1.5">
                  <span>Pessimistic (10th %ile)</span>
                  <span>Expected (median)</span>
                  <span>Optimistic (90th %ile)</span>
                </div>
                <p className="text-[10px] text-slate-400 mt-1.5 leading-relaxed">
                  Based on fixture difficulty, form, and historical variance. 90% of outcomes fall within this range.
                </p>
              </div>
            )}
          </StatsSection>

          <StatsSection title="xPts Breakdown">
            <div className="grid grid-cols-2 gap-3 text-center">
              <div className="rounded-lg bg-slate-50 p-2">
                <p className="text-xs text-slate-500">Appearance</p>
                <p className="text-lg font-semibold text-slate-800">{(insights?.breakdown.appearance ?? 0).toFixed(2)}</p>
              </div>
              <div className="rounded-lg bg-slate-50 p-2">
                <p className="text-xs text-slate-500">xG Pts</p>
                <p className="text-lg font-semibold text-slate-800">{(insights?.breakdown.goals ?? 0).toFixed(2)}</p>
              </div>
              <div className="rounded-lg bg-slate-50 p-2">
                <p className="text-xs text-slate-500">xA Pts</p>
                <p className="text-lg font-semibold text-slate-800">{(insights?.breakdown.assists ?? 0).toFixed(2)}</p>
              </div>
              <div className="rounded-lg bg-slate-50 p-2">
                <p className="text-xs text-slate-500">CS Pts</p>
                <p className="text-lg font-semibold text-slate-800">{(insights?.breakdown.cleanSheet ?? 0).toFixed(2)}</p>
              </div>
            </div>
            <div className="mt-3 rounded-lg bg-slate-50 p-2 text-center">
              <p className="text-xs text-slate-500">Bonus</p>
              <p className="text-lg font-semibold text-slate-800">{(insights?.breakdown.bonus ?? 0).toFixed(2)}</p>
            </div>
          </StatsSection>

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
              <div className="space-y-3">
                <div className="flex items-center gap-2 flex-wrap">
                  {fixtureList.map((fixture, idx) => (
                    <FdrChip key={`${fixture.opponent}-${idx}`} difficulty={fixture.difficulty} opponent={fixture.opponent} isHome={fixture.isHome} size="md" />
                  ))}
                </div>
                {insights?.fixtures?.length ? (
                  <div className="flex items-center gap-2 flex-wrap">
                    {insights.fixtures.map(fixture => (
                      <button
                        key={`xpts-${fixture.fixtureId}`}
                        type="button"
                        className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700"
                      >
                        {fixture.opponent} {fixture.expectedPoints.toFixed(1)} xPts
                      </button>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-400">xPts chips coming soon</p>
                )}
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
            <div className="grid grid-cols-2 gap-3 text-center">
              <div className="rounded-lg bg-slate-50 p-2">
                <p className="text-xs text-slate-500">xG</p>
                <p className="text-lg font-semibold text-slate-800">{(insights?.advanced.xG ?? 0).toFixed(2)}</p>
              </div>
              <div className="rounded-lg bg-slate-50 p-2">
                <p className="text-xs text-slate-500">xA</p>
                <p className="text-lg font-semibold text-slate-800">{(insights?.advanced.xA ?? 0).toFixed(2)}</p>
              </div>
              <div className="rounded-lg bg-slate-50 p-2">
                <p className="text-xs text-slate-500">xGI</p>
                <p className="text-lg font-semibold text-slate-800">{(insights?.advanced.xGI ?? 0).toFixed(2)}</p>
              </div>
              <div className="rounded-lg bg-slate-50 p-2">
                <p className="text-xs text-slate-500">xGI/90</p>
                <p className="text-lg font-semibold text-slate-800">{(insights?.advanced.xGI90 ?? 0).toFixed(2)}</p>
              </div>
            </div>
            {insights && (insights.advanced.shots !== null || insights.advanced.bigChances !== null) ? (
              <div className="mt-3 grid grid-cols-2 gap-3 text-center">
                <div className="rounded-lg bg-slate-50 p-2">
                  <p className="text-xs text-slate-500">Shots</p>
                  <p className="text-lg font-semibold text-slate-800">{insights?.advanced.shots ?? 0}</p>
                </div>
                <div className="rounded-lg bg-slate-50 p-2">
                  <p className="text-xs text-slate-500">Big Chances</p>
                  <p className="text-lg font-semibold text-slate-800">{insights?.advanced.bigChances ?? 0}</p>
                </div>
              </div>
            ) : (
              <p className="text-xs text-slate-500 mt-3">Understat shot breakdown coming soon.</p>
            )}
          </StatsSection>

          {advanced && (advanced.goals !== undefined || advanced.leaguePosition !== undefined) && (
            <StatsSection title="Season Performance">
              <div className="grid grid-cols-3 gap-3 text-center">
                {advanced.goals !== undefined && (
                  <div className="rounded-lg bg-emerald-50 p-2">
                    <p className="text-xs text-emerald-600">Goals</p>
                    <p className="text-lg font-semibold text-emerald-700">{advanced.goals}</p>
                  </div>
                )}
                {advanced.assists !== undefined && (
                  <div className="rounded-lg bg-blue-50 p-2">
                    <p className="text-xs text-blue-600">Assists</p>
                    <p className="text-lg font-semibold text-blue-700">{advanced.assists}</p>
                  </div>
                )}
                {advanced.penalties !== undefined && advanced.penalties !== null && advanced.penalties > 0 && (
                  <div className="rounded-lg bg-amber-50 p-2">
                    <p className="text-xs text-amber-600">Penalties</p>
                    <p className="text-lg font-semibold text-amber-700">{advanced.penalties}</p>
                  </div>
                )}
                {advanced.playedMatches !== undefined && (
                  <div className="rounded-lg bg-slate-50 p-2">
                    <p className="text-xs text-slate-500">Matches</p>
                    <p className="text-lg font-semibold text-slate-800">{advanced.playedMatches}</p>
                  </div>
                )}
                {advanced.shots !== undefined && (
                  <div className="rounded-lg bg-purple-50 p-2">
                    <p className="text-xs text-purple-600">Shots</p>
                    <p className="text-lg font-semibold text-purple-700">{advanced.shots}</p>
                  </div>
                )}
                {advanced.rating !== undefined && (
                  <div className="rounded-lg bg-orange-50 p-2">
                    <p className="text-xs text-orange-600">Rating</p>
                    <p className="text-lg font-semibold text-orange-700">{typeof advanced.rating === 'number' ? advanced.rating.toFixed(1) : advanced.rating}</p>
                  </div>
                )}
              </div>
              {advanced.leaguePosition !== undefined && (
                <div className="mt-3 p-3 rounded-lg bg-fpl-forest/5 border border-fpl-forest/10">
                  <p className="text-xs text-fpl-forest font-medium mb-2">Team Context</p>
                  <div className="grid grid-cols-4 gap-2 text-center text-sm">
                    <div>
                      <p className="text-xs text-slate-500">Position</p>
                      <p className="font-bold text-fpl-forest">{advanced.leaguePosition}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">Points</p>
                      <p className="font-semibold text-slate-700">{advanced.teamPoints}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">GF</p>
                      <p className="font-semibold text-emerald-600">{advanced.teamGoalsFor}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">GA</p>
                      <p className="font-semibold text-red-600">{advanced.teamGoalsAgainst}</p>
                    </div>
                  </div>
                </div>
              )}
            </StatsSection>
          )}
        </div>
      )}
    </div>
  );
}
