import { TeamBadge } from './ui';
import { getFixtureStatus, type RawFixture, type LiveFixtureData } from '../utils/fixtureStatus';

interface Team {
  id: number;
  name: string;
  shortName: string;
  badge: string;
}

interface LiveFixturesHubProps {
  fixtures: RawFixture[];
  teams: Map<number, Team>;
  liveData?: Map<number, LiveFixtureData>;
  onFixtureClick?: (fixtureId: number) => void;
}

export function LiveFixturesHub({ fixtures, teams, liveData, onFixtureClick }: LiveFixturesHubProps) {
  if (fixtures.length === 0) {
    return (
      <div className="bg-slate-800 border border-slate-700 rounded-lg p-8 text-center">
        <p className="text-slate-400">No fixtures for this gameweek</p>
      </div>
    );
  }

  // Sort fixtures: live first, then by kickoff time
  const sortedFixtures = [...fixtures].sort((a, b) => {
    const statusA = getFixtureStatus(a, liveData?.get(a.id));
    const statusB = getFixtureStatus(b, liveData?.get(b.id));

    // Live matches first
    if (statusA.state === 'LIVE' && statusB.state !== 'LIVE') return -1;
    if (statusB.state === 'LIVE' && statusA.state !== 'LIVE') return 1;

    // Then by kickoff time
    const kickoffA = a.kickoff_time ? new Date(a.kickoff_time).getTime() : 0;
    const kickoffB = b.kickoff_time ? new Date(b.kickoff_time).getTime() : 0;
    return kickoffA - kickoffB;
  });

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {sortedFixtures.map(fixture => {
        const homeTeam = teams.get(fixture.team_h);
        const awayTeam = teams.get(fixture.team_a);
        const status = getFixtureStatus(fixture, liveData?.get(fixture.id));
        const isLive = status.state === 'LIVE' || status.state === 'HT';

        return (
          <button
            key={fixture.id}
            type="button"
            onClick={() => onFixtureClick?.(fixture.id)}
            className={`bg-slate-800 border rounded-lg p-4 text-left transition-all hover:border-slate-600 ${
              isLive ? 'border-emerald-500/50 ring-1 ring-emerald-500/20' : 'border-slate-700'
            }`}
          >
            {/* Status badge */}
            <div className="flex items-center justify-between mb-3">
              <span
                className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase ${
                  status.state === 'LIVE'
                    ? 'bg-emerald-500/20 text-emerald-400'
                    : status.state === 'HT'
                    ? 'bg-amber-500/20 text-amber-400'
                    : status.state === 'FT'
                    ? 'bg-slate-700 text-slate-400'
                    : 'bg-slate-700 text-slate-500'
                }`}
              >
                {status.state === 'LIVE' && (
                  <span className="inline-block w-1.5 h-1.5 bg-emerald-400 rounded-full mr-1 animate-pulse" />
                )}
                {status.display}
              </span>
            </div>

            {/* Teams and score */}
            <div className="space-y-2">
              {/* Home team */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <TeamBadge badge={homeTeam?.badge ?? ''} name={homeTeam?.name ?? ''} size="md" />
                  <span className="font-medium text-slate-200 truncate text-sm">
                    {homeTeam?.shortName ?? 'HOME'}
                  </span>
                </div>
                {status.score !== undefined && (
                  <span
                    className={`text-lg font-bold tabular-nums ${
                      isLive ? 'text-emerald-400' : 'text-slate-200'
                    }`}
                  >
                    {status.score.home}
                  </span>
                )}
              </div>

              {/* Away team */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <TeamBadge badge={awayTeam?.badge ?? ''} name={awayTeam?.name ?? ''} size="md" />
                  <span className="font-medium text-slate-200 truncate text-sm">
                    {awayTeam?.shortName ?? 'AWAY'}
                  </span>
                </div>
                {status.score !== undefined && (
                  <span
                    className={`text-lg font-bold tabular-nums ${
                      isLive ? 'text-emerald-400' : 'text-slate-200'
                    }`}
                  >
                    {status.score.away}
                  </span>
                )}
              </div>
            </div>

            {/* Optional: CS chance / implied goals placeholder */}
            {isLive && (
              <div className="mt-3 pt-2 border-t border-slate-700 flex items-center gap-2 text-[10px]">
                <span className="text-slate-500">Click for match details</span>
              </div>
            )}
          </button>
        );
      })}
    </div>
  );
}
