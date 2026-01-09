function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function createMockOddsProvider({ teamStats, teamStrength }) {
  return {
    getImpliedGoals(fixture) {
      const homeStats = teamStats.get(fixture.team_h) || {};
      const awayStats = teamStats.get(fixture.team_a) || {};
      const homeStrength = teamStrength.get(fixture.team_h) || {};
      const awayStrength = teamStrength.get(fixture.team_a) || {};

      const homeBase = homeStats.homeGoalsPerGame ?? 1.4;
      const awayBase = awayStats.awayGoalsPerGame ?? 1.1;
      const homeConcede = awayStats.awayConcededPerGame ?? 1.3;
      const awayConcede = homeStats.homeConcededPerGame ?? 1.2;

      const homeAttackFactor = (homeStrength.homeAttack ?? 100) / 100;
      const awayAttackFactor = (awayStrength.awayAttack ?? 100) / 100;
      const homeDefFactor = (awayStrength.awayDefence ?? 100) / 100;
      const awayDefFactor = (homeStrength.homeDefence ?? 100) / 100;

      const homeXG = clamp(((homeBase + homeConcede) / 2) * (homeAttackFactor / homeDefFactor), 0.4, 3.5);
      const awayXG = clamp(((awayBase + awayConcede) / 2) * (awayAttackFactor / awayDefFactor), 0.3, 3.0);

      return {
        homeXG: Math.round(homeXG * 100) / 100,
        awayXG: Math.round(awayXG * 100) / 100,
      };
    },
    getCleanSheetProb(teamId, opponentId, isHome) {
      const teamStat = teamStats.get(teamId) || {};
      const oppStat = teamStats.get(opponentId) || {};
      const teamStr = teamStrength.get(teamId) || {};
      const oppStr = teamStrength.get(opponentId) || {};

      const baseRate = isHome ? teamStat.homeCleanSheetRate : teamStat.awayCleanSheetRate;
      const oppScoringRate = isHome ? oppStat.awayGoalsPerGame : oppStat.homeGoalsPerGame;
      const defStrength = isHome ? teamStr.homeDefence : teamStr.awayDefence;
      const oppAttStrength = isHome ? oppStr.awayAttack : oppStr.homeAttack;

      let prob = (baseRate ?? 0.25) * 100;
      if (oppScoringRate > 2) prob *= 0.65;
      else if (oppScoringRate > 1.5) prob *= 0.8;
      else if (oppScoringRate < 0.9) prob *= 1.15;

      const strengthDiff = (defStrength ?? 100) - (oppAttStrength ?? 100);
      prob += strengthDiff / 20;

      return Math.round(clamp(prob, 10, 65));
    },
  };
}

module.exports = { createMockOddsProvider };
