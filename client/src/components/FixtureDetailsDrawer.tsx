import { useState, useEffect } from 'react';
import { TeamBadge, PlayerPhoto } from './ui';

interface FixtureTeam {
  id: number;
  name: string;
  shortName: string;
  badge: string;
  score: number | null;
}

interface Goal {
  playerId: number;
  playerName: string;
  team: 'home' | 'away';
  isOwnGoal?: boolean;
  minute?: number;
}

interface Card {
  playerId: number;
  playerName: string;
  team: 'home' | 'away';
  type: 'yellow' | 'red';
}

interface TopPerformer {
  id: number;
  name: string;
  points: number;
  goals: number;
  assists: number;
  minutes: number;
  photoCode?: number;
}

interface FixtureDetails {
  id: number;
  gameweek: number;
  kickoffTime: string;
  started: boolean;
  finished: boolean;
  finishedProvisional: boolean;
  minutes: number;
  homeTeam: FixtureTeam;
  awayTeam: FixtureTeam;
  goals: Goal[];
  cards: Card[];
  topPerformers: {
    home: TopPerformer[];
    away: TopPerformer[];
  };
}

interface FixtureDetailsDrawerProps {
  fixtureId: number | null;
  onClose: () => void;
  onPlayerClick?: (id: number) => void;
}

export function FixtureDetailsDrawer({ fixtureId, onClose, onPlayerClick }: FixtureDetailsDrawerProps) {
  const [details, setDetails] = useState<FixtureDetails | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!fixtureId) {
      setDetails(null);
      return;
    }

    async function fetchDetails() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/fixture/${fixtureId}/details`);
        if (!res.ok) throw new Error('Failed to fetch fixture details');
        const data = await res.json();
        setDetails(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load');
      } finally {
        setLoading(false);
      }
    }

    fetchDetails();
  }, [fixtureId]);

  if (!fixtureId) return null;

  const isLive = details?.started && !details?.finished;
  const homeGoals = details?.goals.filter(g => g.team === 'home') ?? [];
  const awayGoals = details?.goals.filter(g => g.team === 'away') ?? [];
  const homeCards = details?.cards.filter(c => c.team === 'home') ?? [];
  const awayCards = details?.cards.filter(c => c.team === 'away') ?? [];

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-40"
        onClick={onClose}
      />

      {/* Drawer */}
      <div className="fixed right-0 top-0 bottom-0 w-full max-w-md bg-slate-900 border-l border-slate-700 z-50 overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-slate-900 border-b border-slate-700 p-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-100">Match Details</h2>
            <button
              type="button"
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-200 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-4">
          {loading && (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500" />
            </div>
          )}

          {error && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 text-center">
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}

          {details && !loading && (
            <div className="space-y-6">
              {/* Score header */}
              <div className={`bg-slate-800 border rounded-lg p-4 ${isLive ? 'border-emerald-500/50' : 'border-slate-700'}`}>
                {/* Status badge */}
                <div className="flex justify-center mb-3">
                  <span
                    className={`px-3 py-1 rounded text-xs font-semibold uppercase ${
                      isLive
                        ? 'bg-emerald-500/20 text-emerald-400'
                        : details.finished
                        ? 'bg-slate-700 text-slate-400'
                        : 'bg-blue-500/20 text-blue-400'
                    }`}
                  >
                    {isLive && (
                      <span className="inline-block w-2 h-2 bg-emerald-400 rounded-full mr-1.5 animate-pulse" />
                    )}
                    {isLive ? `${details.minutes}'` : details.finished ? 'FT' : 'Upcoming'}
                  </span>
                </div>

                {/* Teams and score */}
                <div className="flex items-center justify-between">
                  {/* Home team */}
                  <div className="flex-1 text-center">
                    <TeamBadge badge={details.homeTeam.badge} name={details.homeTeam.name} size="lg" />
                    <p className="font-medium text-slate-200 mt-2">{details.homeTeam.shortName}</p>
                  </div>

                  {/* Score */}
                  <div className="px-6">
                    {details.started ? (
                      <div className={`text-4xl font-bold tabular-nums ${isLive ? 'text-emerald-400' : 'text-slate-100'}`}>
                        {details.homeTeam.score ?? 0} - {details.awayTeam.score ?? 0}
                      </div>
                    ) : (
                      <div className="text-lg text-slate-500">
                        {new Date(details.kickoffTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    )}
                  </div>

                  {/* Away team */}
                  <div className="flex-1 text-center">
                    <TeamBadge badge={details.awayTeam.badge} name={details.awayTeam.name} size="lg" />
                    <p className="font-medium text-slate-200 mt-2">{details.awayTeam.shortName}</p>
                  </div>
                </div>
              </div>

              {/* Goals */}
              {(details.started || details.finished) && (homeGoals.length > 0 || awayGoals.length > 0) && (
                <div className="bg-slate-800 border border-slate-700 rounded-lg p-4">
                  <h3 className="text-sm font-medium text-slate-400 uppercase tracking-wide mb-3">Goals</h3>
                  <div className="grid grid-cols-2 gap-4">
                    {/* Home goals */}
                    <div className="space-y-2">
                      {homeGoals.map((goal, idx) => (
                        <button
                          key={`home-goal-${idx}`}
                          type="button"
                          onClick={() => onPlayerClick?.(goal.playerId)}
                          className="flex items-center gap-2 text-left hover:text-emerald-400 transition-colors w-full"
                        >
                          <span className="text-emerald-400">&#9917;</span>
                          <span className="text-sm text-slate-200 truncate">
                            {goal.playerName}
                            {goal.isOwnGoal && <span className="text-red-400 ml-1">(OG)</span>}
                          </span>
                        </button>
                      ))}
                      {homeGoals.length === 0 && (
                        <p className="text-xs text-slate-600">-</p>
                      )}
                    </div>

                    {/* Away goals */}
                    <div className="space-y-2 text-right">
                      {awayGoals.map((goal, idx) => (
                        <button
                          key={`away-goal-${idx}`}
                          type="button"
                          onClick={() => onPlayerClick?.(goal.playerId)}
                          className="flex items-center gap-2 justify-end text-right hover:text-emerald-400 transition-colors w-full"
                        >
                          <span className="text-sm text-slate-200 truncate">
                            {goal.playerName}
                            {goal.isOwnGoal && <span className="text-red-400 ml-1">(OG)</span>}
                          </span>
                          <span className="text-emerald-400">&#9917;</span>
                        </button>
                      ))}
                      {awayGoals.length === 0 && (
                        <p className="text-xs text-slate-600">-</p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Cards */}
              {(details.started || details.finished) && (homeCards.length > 0 || awayCards.length > 0) && (
                <div className="bg-slate-800 border border-slate-700 rounded-lg p-4">
                  <h3 className="text-sm font-medium text-slate-400 uppercase tracking-wide mb-3">Cards</h3>
                  <div className="grid grid-cols-2 gap-4">
                    {/* Home cards */}
                    <div className="space-y-2">
                      {homeCards.map((card, idx) => (
                        <button
                          key={`home-card-${idx}`}
                          type="button"
                          onClick={() => onPlayerClick?.(card.playerId)}
                          className="flex items-center gap-2 text-left hover:text-slate-300 transition-colors w-full"
                        >
                          <span className={`w-3 h-4 rounded-sm ${card.type === 'yellow' ? 'bg-yellow-400' : 'bg-red-500'}`} />
                          <span className="text-sm text-slate-200 truncate">{card.playerName}</span>
                        </button>
                      ))}
                      {homeCards.length === 0 && (
                        <p className="text-xs text-slate-600">-</p>
                      )}
                    </div>

                    {/* Away cards */}
                    <div className="space-y-2 text-right">
                      {awayCards.map((card, idx) => (
                        <button
                          key={`away-card-${idx}`}
                          type="button"
                          onClick={() => onPlayerClick?.(card.playerId)}
                          className="flex items-center gap-2 justify-end text-right hover:text-slate-300 transition-colors w-full"
                        >
                          <span className="text-sm text-slate-200 truncate">{card.playerName}</span>
                          <span className={`w-3 h-4 rounded-sm ${card.type === 'yellow' ? 'bg-yellow-400' : 'bg-red-500'}`} />
                        </button>
                      ))}
                      {awayCards.length === 0 && (
                        <p className="text-xs text-slate-600">-</p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Top FPL Performers */}
              {(details.started || details.finished) && (
                <div className="bg-slate-800 border border-slate-700 rounded-lg p-4">
                  <h3 className="text-sm font-medium text-slate-400 uppercase tracking-wide mb-3">Top FPL Performers</h3>
                  <div className="grid grid-cols-2 gap-4">
                    {/* Home performers */}
                    <div>
                      <p className="text-xs text-slate-500 mb-2">{details.homeTeam.shortName}</p>
                      <div className="space-y-2">
                        {details.topPerformers.home.map((player) => (
                          <button
                            key={player.id}
                            type="button"
                            onClick={() => onPlayerClick?.(player.id)}
                            className="flex items-center gap-2 w-full text-left hover:bg-slate-700/50 rounded p-1 transition-colors"
                          >
                            <PlayerPhoto photoCode={player.photoCode ?? 0} name={player.name} size="sm" />
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-medium text-slate-200 truncate">{player.name}</p>
                              <p className="text-[10px] text-slate-500">
                                {player.goals > 0 && `${player.goals}G `}
                                {player.assists > 0 && `${player.assists}A`}
                                {player.goals === 0 && player.assists === 0 && `${player.minutes}'`}
                              </p>
                            </div>
                            <span className="text-emerald-400 font-bold text-sm">{player.points}</span>
                          </button>
                        ))}
                        {details.topPerformers.home.length === 0 && (
                          <p className="text-xs text-slate-600">No data yet</p>
                        )}
                      </div>
                    </div>

                    {/* Away performers */}
                    <div>
                      <p className="text-xs text-slate-500 mb-2">{details.awayTeam.shortName}</p>
                      <div className="space-y-2">
                        {details.topPerformers.away.map((player) => (
                          <button
                            key={player.id}
                            type="button"
                            onClick={() => onPlayerClick?.(player.id)}
                            className="flex items-center gap-2 w-full text-left hover:bg-slate-700/50 rounded p-1 transition-colors"
                          >
                            <PlayerPhoto photoCode={player.photoCode ?? 0} name={player.name} size="sm" />
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-medium text-slate-200 truncate">{player.name}</p>
                              <p className="text-[10px] text-slate-500">
                                {player.goals > 0 && `${player.goals}G `}
                                {player.assists > 0 && `${player.assists}A`}
                                {player.goals === 0 && player.assists === 0 && `${player.minutes}'`}
                              </p>
                            </div>
                            <span className="text-emerald-400 font-bold text-sm">{player.points}</span>
                          </button>
                        ))}
                        {details.topPerformers.away.length === 0 && (
                          <p className="text-xs text-slate-600">No data yet</p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Kickoff info for upcoming */}
              {!details.started && (
                <div className="bg-slate-800 border border-slate-700 rounded-lg p-4 text-center">
                  <p className="text-sm text-slate-400">Kickoff</p>
                  <p className="text-lg font-medium text-slate-200">
                    {new Date(details.kickoffTime).toLocaleDateString([], {
                      weekday: 'short',
                      month: 'short',
                      day: 'numeric',
                    })}
                    {' at '}
                    {new Date(details.kickoffTime).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
