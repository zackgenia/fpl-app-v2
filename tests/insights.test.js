const test = require('node:test');
const assert = require('node:assert/strict');
const { poissonCleanSheetProbability, mapExpectedPoints } = require('../shared/insights');

test('poisson clean sheet probability clamps to bounds', () => {
  const extremeHigh = poissonCleanSheetProbability(4);
  const extremeLow = poissonCleanSheetProbability(0.05);

  assert.ok(extremeHigh >= 0.05 && extremeHigh <= 0.65);
  assert.ok(extremeLow >= 0.05 && extremeLow <= 0.65);
});

test('mapExpectedPoints returns expected breakdown', () => {
  const result = mapExpectedPoints({
    position: 'DEF',
    expectedMinutes: 90,
    expectedGoals: 0.2,
    expectedAssists: 0.1,
    cleanSheetProb: 0.4,
    bonusExpectation: 0.5,
  });

  assert.equal(Math.round(result.appearancePoints * 10) / 10, 2);
  assert.ok(Math.abs(result.goalPoints - 1.2) < 0.001);
  assert.ok(Math.abs(result.assistPoints - 0.3) < 0.001);
  assert.ok(Math.abs(result.cleanSheetPoints - 1.6) < 0.001);
  assert.ok(Math.abs(result.total - 5.6) < 0.001);
});
