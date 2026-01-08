import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Loading, ErrorMessage, TeamBadge } from '../components';

interface LiveFixture {
  id: number;
  event: number;
  kickoff_time: string;
  started: boolean;
  finished: boolean;
  finished_provisional: boolean;
  team_h: number;
  team_a: number;
  team_h_score: number | null;
  team_a_score: number | null;
  team_h_difficulty: number;
  team_a_difficulty: number;
}

interface Team {
  id: number;
  name: string;
  short_name: string;
  code: number;
}

interface Event {
  id: number;
  name: string;
  deadline_time: string;
  finished: boolean;
  is_current: boolean;
  is_next: boolean;
}

interface BootstrapData {
  teams: Team[];
  events: Event[];
}

function getTeamBadgeUrl(team: Team | undefined) {
  if (!team) return '';
  return `https://resources.premierleague.com/premierleague/badges/50/t${team.code}.png`;
}

function formatKickoff(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
}

function getMatchStatus(fixture: LiveFixture): { label: string; className: string } {
  if (fixture.finished || fixture.finished_provisional) {
    return { label: 'FT', className: 'bg-slate-600 text-white' };
  }
  if (fixture.started) {
    return { label: 'LIVE', className: 'bg-red-500 text-white animate-pulse' };
  }
  return { label: formatKickoff(fixture.kickoff_time), className: 'bg-slate-100 text-slate-600' };
}

export function Live() {
  const [bootstrap, setBootstrap] = useState<BootstrapData | null>(null);
  const [fixtures, setFixtures] = useState<LiveFixture[]>([]);
  const [selectedGw, setSelectedGw] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const refreshIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Fetch bootstrap data (teams, events) via backend proxy
  const fetchBootstrap = useCallback(async () => {
    try {
      const response = await fetch('/api/fpl/bootstrap');
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to fetch FPL data');
      }
      const data = await response.json();
      setBootstrap({ teams: data.teams, events: data.events });
      
      // Set initial gameweek to current or next
      const currentEvent = data.events.find((e: Event) => e.is_current) || 
                          data.events.find((e: Event) => e.is_next) ||
                          data.events[0];
      if (currentEvent && selectedGw === null) {
        setSelectedGw(currentEvent.id);
      }
      return data;
    } catch (err) {
      throw err;
    }
  }, [selectedGw]);

  // Fetch fixtures for selected gameweek via backend proxy
  const fetchFixtures = useCallback(async (gw: number) => {
    try {
      const response = await fetch(`/api/fpl/fixtures?event=${gw}`);
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to fetch fixtures');
      }
      const data = await response.json();
      setFixtures(data);
      setLastUpdated(new Date());
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load fixtures');
    }
  }, []);

  // Initial load
  useEffect(() => {
    const init = async () => {
      setLoading(true);
      try {
        await fetchBootstrap();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load');
      } finally {
        setLoading(false);
      }
    };
    init();
  }, [fetchBootstrap]);

  // Fetch fixtures when gameweek changes
  useEffect(() => {
    if (selectedGw !== null) {
      fetchFixtures(selectedGw);
    }
  }, [selectedGw, fetchFixtures]);

  // Auto-refresh every 30 seconds
  useEffect(() => {
    if (selectedGw === null) return;

    // Clear any existing interval
    if (refreshIntervalRef.current) {
      clearInterval(refreshIntervalRef.current);
    }

    // Set up new interval
    refreshIntervalRef.current = setInterval(() => {
      // Only refresh if document is visible
      if (!document.hidden) {
        fetchFixtures(selectedGw);
      }
    }, 30000);

    return () => {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
      }
    };
  }, [selectedGw, fetchFixtures]);

  // Group fixtures by date
  const fixturesByDate = useMemo(() => {
    const groups = new Map<string, LiveFixture[]>();
    
    fixtures.forEach(fixture => {
      const dateKey = formatDate(fixture.kickoff_time);
      if (!groups.has(dateKey)) {
        groups.set(dateKey, []);
      }
      groups.get(dateKey)!.push(fixture);
    });
    
    // Sort fixtures within each group by kickoff time
    groups.forEach((groupFixtures) => {
      groupFixtures.sort((a, b) => 
        new Date(a.kickoff_time).getTime() - new Date(b.kickoff_time).getTime()
      );
    });
    
    return groups;
  }, [fixtures]);

  // Team lookup
  const teamsById = useMemo(() => {
    if (!bootstrap) return new Map<number, Team>();
    return new Map(bootstrap.teams.map(t => [t.id, t]));
  }, [bootstrap]);

  // Event list for dropdown
  const events = useMemo(() => {
    if (!bootstrap) return [];
    return bootstrap.events.filter(e => e.id <= 38);
  }, [bootstrap]);

  // Current event for display
  const currentEvent = useMemo(() => {
    if (!bootstrap || !selectedGw) return null;
    return bootstrap.events.find(e => e.id === selectedGw);
  }, [bootstrap, selectedGw]);

  // Check if any fixtures are live
  const hasLiveFixtures = useMemo(() => {
    return fixtures.some(f => f.started && !f.finished && !f.finished_provisional);
  }, [fixtures]);

  const handlePrevGw = () => {
    if (selectedGw && selectedGw > 1) {
      setSelectedGw(selectedGw - 1);
    }
  };

  const handleNextGw = () => {
    if (selectedGw && selectedGw < 38) {
      setSelectedGw(selectedGw + 1);
    }
  };

  if (loading) return <Loading message="Loading live data..." />;
  if (error && !bootstrap) return <ErrorMessage message={error} onRetry={() => window.location.reload()} />;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="card p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-3">
              Live
              {hasLiveFixtures && (
                <span className="flex items-center gap-1.5 text-sm font-medium text-red-500">
                  <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                  Matches in progress
                </span>
              )}
            </h2>
            <p className="text-slate-500">
              {currentEvent?.name ?? 'Gameweek'} fixtures and results
            </p>
          </div>
          
          {/* GW Selector */}
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrevGw}
              disabled={!selectedGw || selectedGw <= 1}
              className="w-10 h-10 rounded-lg bg-slate-100 hover:bg-slate-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center text-slate-600 font-bold"
            >
              ←
            </button>
            
            <select
              value={selectedGw ?? ''}
              onChange={e => setSelectedGw(parseInt(e.target.value))}
              className="px-4 py-2.5 bg-white border border-slate-200 rounded-lg font-medium min-w-[160px] focus:outline-none focus:ring-2 focus:ring-fpl-forest/20"
            >
              {events.map(event => (
                <option key={event.id} value={event.id}>
                  {event.name}
                  {event.is_current ? ' (Current)' : ''}
                  {event.is_next && !event.is_current ? ' (Next)' : ''}
                </option>
              ))}
            </select>
            
            <button
              onClick={handleNextGw}
              disabled={!selectedGw || selectedGw >= 38}
              className="w-10 h-10 rounded-lg bg-slate-100 hover:bg-slate-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center text-slate-600 font-bold"
            >
              →
            </button>
          </div>
        </div>
        
        {/* Last updated */}
        {lastUpdated && (
          <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between text-sm text-slate-500">
            <span>Last updated: {lastUpdated.toLocaleTimeString()}</span>
            <button
              onClick={() => selectedGw && fetchFixtures(selectedGw)}
              className="text-fpl-forest hover:underline font-medium"
            >
              Refresh now
            </button>
          </div>
        )}
      </div>

      {/* Error message (non-blocking) */}
      {error && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-amber-700 flex items-center gap-2">
          <span>⚠️</span> {error}
          <button
            onClick={() => selectedGw && fetchFixtures(selectedGw)}
            className="ml-auto text-amber-800 font-medium hover:underline"
          >
            Retry
          </button>
        </div>
      )}

      {/* Fixtures by date */}
      {fixtures.length === 0 ? (
        <div className="card p-12 text-center">
          <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-3xl">📅</span>
          </div>
          <h3 className="text-xl font-bold text-slate-800 mb-2">No fixtures</h3>
          <p className="text-slate-500">No fixtures found for this gameweek.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {Array.from(fixturesByDate.entries()).map(([date, dateFixtures]) => (
            <div key={date} className="card overflow-hidden">
              {/* Date header */}
              <div className="bg-slate-50 px-6 py-3 border-b border-slate-200">
                <h3 className="font-semibold text-slate-700">{date}</h3>
              </div>
              
              {/* Fixtures list */}
              <div className="divide-y divide-slate-100">
                {dateFixtures.map(fixture => {
                  const homeTeam = teamsById.get(fixture.team_h);
                  const awayTeam = teamsById.get(fixture.team_a);
                  const status = getMatchStatus(fixture);
                  
                  return (
                    <div
                      key={fixture.id}
                      className={`px-6 py-4 flex items-center gap-4 ${
                        fixture.started && !fixture.finished ? 'bg-red-50/30' : ''
                      }`}
                    >
                      {/* Home team */}
                      <div className="flex-1 flex items-center justify-end gap-3">
                        <span className="font-semibold text-slate-800 text-right">
                          {homeTeam?.name ?? 'Unknown'}
                        </span>
                        <TeamBadge
                          badge={getTeamBadgeUrl(homeTeam)}
                          name={homeTeam?.short_name ?? ''}
                          size="lg"
                        />
                      </div>
                      
                      {/* Score / Status */}
                      <div className="w-28 flex flex-col items-center gap-1">
                        {fixture.started || fixture.finished ? (
                          <div className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                            <span>{fixture.team_h_score ?? 0}</span>
                            <span className="text-slate-300">-</span>
                            <span>{fixture.team_a_score ?? 0}</span>
                          </div>
                        ) : (
                          <div className="text-lg font-semibold text-slate-400">vs</div>
                        )}
                        <span className={`text-xs font-bold px-2 py-0.5 rounded ${status.className}`}>
                          {status.label}
                        </span>
                      </div>
                      
                      {/* Away team */}
                      <div className="flex-1 flex items-center gap-3">
                        <TeamBadge
                          badge={getTeamBadgeUrl(awayTeam)}
                          name={awayTeam?.short_name ?? ''}
                          size="lg"
                        />
                        <span className="font-semibold text-slate-800">
                          {awayTeam?.name ?? 'Unknown'}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Auto-refresh notice */}
      <div className="text-center text-sm text-slate-400">
        Auto-refreshes every 30 seconds when page is visible
      </div>
    </div>
  );
}
