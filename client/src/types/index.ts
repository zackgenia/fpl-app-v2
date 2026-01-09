export type Position = 'GK' | 'DEF' | 'MID' | 'FWD';

export interface Player {
  id: number;
  webName: string;
  firstName: string;
  secondName: string;
  teamId: number;
  position: number;
  cost: number;
  form: string;
  totalPoints: number;
  pointsPerGame: string;
  selectedByPercent: string;
  status: string;
  news: string;
  chanceOfPlaying: number | null;
  minutes: number;
  goals: number;
  assists: number;
  cleanSheets: number;
  penaltiesOrder: number | null;
  cornersOrder: number | null;
  photoCode: number;
  ictIndex: string;
  expectedGoals: string;
  expectedAssists: string;
  threat: string;
  creativity: string;
  influence: string;
}

export interface Team {
  id: number;
  name: string;
  shortName: string;
  strength: number;
  badge: string;
}

export interface ConfidenceLevel {
  label: string;
  color: string;
  icon: string;
}

export interface ConfidenceFactor {
  text: string;
  type: 'positive' | 'warning' | 'danger' | 'info';
}

export interface FixtureDetail {
  gameweek: number;
  opponent: string;
  opponentId: number;
  isHome: boolean;
  difficulty: number;
  expectedPoints: number;
  csChance: number;
  goalChance: number;
  assistChance: number;
}

export interface PlayerPrediction {
  playerId: number;
  webName: string;
  teamId: number;
  teamShortName: string;
  teamBadge: string;
  position: Position;
  cost: number;
  photoCode: number;
  predictedPointsN: number;
  predictedPointsPerGW: number;
  confidence: number;
  confidenceLevel: ConfidenceLevel;
  confidenceFactors: ConfidenceFactor[];
  form: number;
  formTrend: 'rising' | 'stable' | 'falling';
  fixtureScore: number;
  avgFdr: number;
  minutesRisk: number;
  minutesPct: number;
  nextFixtures: { gameweek: number; opponent: string; isHome: boolean; difficulty: number }[];
  fixtureDetails: FixtureDetail[];
  status: string;
  chanceOfPlaying: number | null;
  selectedByPercent: string;
  penaltiesTaker: boolean;
  setpieceTaker: boolean;
  ictIndex: number;
  expectedGoals: number;
  expectedAssists: number;
  expectedGoalInvolvements: number;
  totalPoints: number;
  goalsScored: number;
  assists: number;
  cleanSheets: number;
  bonus: number;
  valueScore: number;
  teamMomentum: number;
}

export interface TransferReason {
  type: 'positive' | 'warning' | 'danger' | 'info';
  icon: string;
  text: string;
}

export interface TransferRecommendation {
  playerOut: PlayerPrediction;
  playerIn: PlayerPrediction;
  netGain: number;
  costChange: number;
  budgetAfter: number;
  reasons: TransferReason[];
  newSquadTotal: number;
}

export interface SquadBaseline {
  totalPredictedPoints: number;
  averageConfidence: number;
}

export interface RecommendationResponse {
  bestTransfer: TransferRecommendation | null;
  topTransfers: TransferRecommendation[];
  topTargetsByPosition: { position: Position; targets: PlayerPrediction[] }[];
  currentGameweek: number;
  horizon: number;
  squadBaseline: SquadBaseline;
}

export interface SquadPlayer {
  id: number;
  webName: string;
  position: Position;
  cost: number;
  teamId: number;
  photoCode?: number;
}

export interface TeamTopPlayers {
  starPlayers: { id: number; name: string; position: string; points: number; form: string; photoCode: number }[];
  topAttackers: { id: number; name: string; position: string; goals: number; assists: number; xG: string; xA: string; goalOdds: number; photoCode: number }[];
  topDefenders: { id: number; name: string; position: string; cleanSheets: number; photoCode: number }[];
}

export interface TeamFixtureData {
  id: number;
  name: string;
  shortName: string;
  badge: string;
  momentum: number;
  stats: { 
    cleanSheetRate: number; 
    homeCleanSheetRate: number;
    awayCleanSheetRate: number;
    goalsPerGame: number; 
    concededPerGame: number;
    form: number;
    last5: string;
  };
  topPlayers: TeamTopPlayers;
}

export interface Fixture {
  id: number;
  teamId: number;
  gameweek: number;
  opponent: string;
  opponentId: number;
  opponentBadge: string;
  isHome: boolean;
  difficulty: number;
  csChance: number;
}

export interface PlayerInsight {
  playerId: number;
  teamId: number;
  position: Position;
  horizon: number;
  xPts: {
    nextFixture: number;
    next3: number;
    next5: number;
    low: number;
    high: number;
  };
  breakdown: {
    appearance: number;
    goals: number;
    assists: number;
    cleanSheet: number;
    bonus: number;
  };
  fixtures: {
    fixtureId: number;
    gameweek: number;
    opponent: string;
    opponentId: number;
    opponentBadge: string;
    isHome: boolean;
    difficulty: number;
    expectedPoints: number;
  }[];
  advanced: {
    xG: number;
    xA: number;
    xGI: number;
    xGI90: number;
    shots: number | null;
    bigChances: number | null;
  };
  estimated: boolean;
}

export interface FixtureInsight {
  fixtureId: number;
  homeTeamId: number;
  awayTeamId: number;
  homeXG: number;
  awayXG: number;
  homeCS: number;
  awayCS: number;
  attackIndex: { home: number; away: number };
  defenceIndex: { home: number; away: number };
  homeKeyPlayers: { id: number; name: string; position: Position; photoCode: number; xPts: number }[];
  awayKeyPlayers: { id: number; name: string; position: Position; photoCode: number; xPts: number }[];
  estimated: boolean;
  horizon: number;
}

export interface TeamInsight {
  teamId: number;
  attackIndex: number;
  defenceIndex: number;
  upcomingCsChance: number;
  impliedGoalsNext: number;
  fixtures: {
    fixtureId: number;
    gameweek: number;
    opponent: string;
    isHome: boolean;
    csChance: number;
    impliedGoals: number;
  }[];
  estimated: boolean;
  horizon: number;
}

export type Strategy = 'maxPoints' | 'value' | 'safety' | 'differential';

export const POSITION_MAP: Record<number, Position> = { 1: 'GK', 2: 'DEF', 3: 'MID', 4: 'FWD' };

export type EntityRef = { kind: 'player' | 'team' | 'fixture'; id: number };
