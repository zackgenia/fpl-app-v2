export type FixtureState = 'UPCOMING' | 'LIVE' | 'HT' | 'FT';

export interface FixtureStatus {
  state: FixtureState;
  display: string;
  score?: { home: number; away: number };
  minutes?: number;
}

export interface RawFixture {
  id: number;
  event: number | null;
  team_h: number;
  team_a: number;
  team_h_score: number | null;
  team_a_score: number | null;
  kickoff_time: string | null;
  started: boolean;
  finished: boolean;
  finished_provisional: boolean;
  minutes?: number;
}

export interface LiveFixtureData {
  id: number;
  team_h_score?: number;
  team_a_score?: number;
  started?: boolean;
  finished?: boolean;
  minutes?: number;
}

/**
 * Determines fixture status from fixture data and optional live data
 */
export function getFixtureStatus(
  fixture: RawFixture | { started?: boolean; finished?: boolean; finished_provisional?: boolean; kickoff_time?: string | null; team_h_score?: number | null; team_a_score?: number | null; minutes?: number },
  liveData?: LiveFixtureData | null
): FixtureStatus {
  const started = liveData?.started ?? fixture.started ?? false;
  const finished = liveData?.finished ?? fixture.finished ?? fixture.finished_provisional ?? false;
  const minutes = liveData?.minutes ?? fixture.minutes ?? 0;
  const homeScore = liveData?.team_h_score ?? fixture.team_h_score ?? 0;
  const awayScore = liveData?.team_a_score ?? fixture.team_a_score ?? 0;

  // Finished match
  if (finished) {
    return {
      state: 'FT',
      display: 'FT',
      score: { home: homeScore, away: awayScore },
    };
  }

  // Live match
  if (started) {
    // Half-time detection (around 45-47 mins with no recent update)
    const isHalfTime = minutes >= 45 && minutes <= 47;

    if (isHalfTime) {
      return {
        state: 'HT',
        display: 'HT',
        score: { home: homeScore, away: awayScore },
        minutes,
      };
    }

    return {
      state: 'LIVE',
      display: `${minutes}'`,
      score: { home: homeScore, away: awayScore },
      minutes,
    };
  }

  // Upcoming match - format kickoff time
  const kickoff = fixture.kickoff_time;
  if (kickoff) {
    const kickoffDate = new Date(kickoff);
    const now = new Date();
    const isToday = kickoffDate.toDateString() === now.toDateString();
    const isTomorrow = kickoffDate.toDateString() === new Date(now.getTime() + 86400000).toDateString();

    if (isToday) {
      return {
        state: 'UPCOMING',
        display: kickoffDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
    }

    if (isTomorrow) {
      return {
        state: 'UPCOMING',
        display: `Tom ${kickoffDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`,
      };
    }

    return {
      state: 'UPCOMING',
      display: kickoffDate.toLocaleDateString([], { weekday: 'short', day: 'numeric' }),
    };
  }

  return {
    state: 'UPCOMING',
    display: 'TBD',
  };
}

/**
 * Determines if a gameweek has any live fixtures
 */
export function hasLiveFixtures(fixtures: RawFixture[]): boolean {
  return fixtures.some(f => f.started && !f.finished && !f.finished_provisional);
}

/**
 * Determines the current/active gameweek
 * Priority: GW with live fixtures > next upcoming GW > last finished GW
 */
export function getCurrentActiveGameweek(
  gameweeks: { id: number; is_current?: boolean; is_next?: boolean; finished?: boolean }[],
  fixtures: RawFixture[]
): number {
  // First check for any GW with live fixtures
  const gwsWithFixtures = new Map<number, RawFixture[]>();
  for (const f of fixtures) {
    if (f.event !== null) {
      if (!gwsWithFixtures.has(f.event)) gwsWithFixtures.set(f.event, []);
      gwsWithFixtures.get(f.event)!.push(f);
    }
  }

  // Find GW with live matches
  for (const [gw, gwFixtures] of gwsWithFixtures) {
    if (hasLiveFixtures(gwFixtures)) {
      return gw;
    }
  }

  // Find next upcoming GW (has fixtures not yet started)
  const sortedGws = Array.from(gwsWithFixtures.keys()).sort((a, b) => a - b);
  for (const gw of sortedGws) {
    const gwFixtures = gwsWithFixtures.get(gw)!;
    const hasUpcoming = gwFixtures.some(f => !f.started && !f.finished);
    if (hasUpcoming) {
      return gw;
    }
  }

  // Fallback: use bootstrap is_current/is_next
  const currentGw = gameweeks.find(gw => gw.is_current);
  if (currentGw) return currentGw.id;

  const nextGw = gameweeks.find(gw => gw.is_next);
  if (nextGw) return nextGw.id;

  // Last resort: highest GW number
  return Math.max(...sortedGws, 1);
}

/**
 * Gets gameweek status label
 */
export function getGameweekStatus(fixtures: RawFixture[]): 'LIVE' | 'UPCOMING' | 'FINISHED' {
  if (fixtures.length === 0) return 'UPCOMING';

  const hasLive = fixtures.some(f => f.started && !f.finished && !f.finished_provisional);
  if (hasLive) return 'LIVE';

  const allFinished = fixtures.every(f => f.finished || f.finished_provisional);
  if (allFinished) return 'FINISHED';

  return 'UPCOMING';
}
