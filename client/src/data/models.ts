export type Position = 'GK' | 'DEF' | 'MID' | 'FWD';

export type FixtureStub = {
  fixtureId: number;
  opponent: string;
  opponentId: number;
  isHome: boolean;
  difficulty: number;
  kickoff: string | null;
};

export type PlayerAdvancedMetrics = {
  xG: number | null;
  xA: number | null;
  xGI: number | null;
  shots: number | null;
  bigChances: number | null;
  teamXG: number | null;
  oppXGA: number | null;
};

export type PlayerDerivedMetrics = {
  expectedPointsNext: number | null;
  expectedGoalsNext: number | null;
  expectedCleanSheetProb: number | null;
};

export type PlayerMetrics = {
  identity: {
    id: number;
    name: string;
    teamId: number;
    teamName: string;
    position: Position;
  };
  fantasy: {
    price: number;
    ownership: number;
    form: number;
    points: number;
    minutes: number;
    transfersTrend: number;
    ictIndex: number;
    bps: number | null;
    bonus: number | null;
  };
  role: {
    starts: number;
    minutesLast5: number;
    minutesTrend: number;
  };
  fixtures: {
    nextFixtures: FixtureStub[];
  };
  advanced: PlayerAdvancedMetrics | null;
  derived: PlayerDerivedMetrics;
};

export type TeamAdvancedMetrics = {
  xGFor: number | null;
  xGAgainst: number | null;
  homeXGFor: number | null;
  awayXGFor: number | null;
  homeXGAgainst: number | null;
  awayXGAgainst: number | null;
};

export type TeamMetrics = {
  basic: {
    id: number;
    name: string;
    shortName: string;
    badge: string;
  };
  fantasy: {
    fdrAverage: number;
    upcomingFixtures: FixtureStub[];
  };
  advanced: TeamAdvancedMetrics | null;
  derived: {
    attackStrength: number | null;
    defenceStrength: number | null;
    cleanSheetRateProxy: number | null;
  };
};

export type FixtureContext = {
  id: number;
  kickoff: string | null;
  teams: {
    homeId: number;
    awayId: number;
    homeName: string;
    awayName: string;
  };
  difficulty: {
    home: number;
    away: number;
  };
  impliedGoals: {
    homeXG: number | null;
    awayXG: number | null;
  } | null;
  cleanSheetProb: {
    homeCS: number | null;
    awayCS: number | null;
  } | null;
  expectedCleanSheetPoints: {
    home: number | null;
    away: number | null;
  } | null;
  keyPlayers: {
    home: { id: number; name: string; position: Position; ownership: number }[];
    away: { id: number; name: string; position: Position; ownership: number }[];
  };
};
