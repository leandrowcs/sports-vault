import assert from 'node:assert/strict';
import { test } from 'node:test';
import { playerMetrics, teamMetrics } from '../src/helpers/sportStatistics.ts';
import type { PlayerSeasonStats, SportEvent, Team } from '../src/types/sports.ts';
const team: Team = { id: 'home', leagueId: 'league', name: 'Team', shortName: 'T', city: 'City', color: '#fff' };
const game = (extra: Partial<SportEvent> = {}): SportEvent => ({ id: 'game', leagueId: 'league', homeTeamId: 'home', awayTeamId: 'away', startsAt: '2026-09-01', status: 'finished', venue: '', homeScore: 2, awayScore: 0, ...extra });
const soccer: PlayerSeasonStats = { season: '2026', competitionId: 'league', appearances: 2, goals: 0, assists: 1, shotsOnTarget: 2, foulsCommitted: 0, yellowCards: 0, recentRatings: [], percentiles: { goals: 0, assists: 0, shotsOnTarget: 0, appearances: 0 } };

test('legacy football stats are never relabeled as basketball or NFL', () => {
  assert.deepEqual(playerMetrics('basketball', soccer), []);
  assert.deepEqual(playerMetrics('american_football', soccer), []);
  assert.equal(playerMetrics('football', soccer).find((m) => m.key === 'goals')?.value, 0);
});
test('basketball uses dedicated point and rebound fields, retaining missing values', () => {
  const metrics = playerMetrics('basketball', { sport: 'basketball', season: '2026', competitionId: 'league', appearances: 2, points: 40, rebounds: 10 });
  assert.equal(metrics.find((m) => m.key === 'points')?.value, 40);
  assert.equal(metrics.find((m) => m.key === 'assists')?.value, null);
  assert.ok(!metrics.some((m) => m.key === 'goals' || m.key === 'shotsOnTarget'));
});
test('NFL uses yardage and touchdown fields without basketball metrics', () => {
  const metrics = playerMetrics('american_football', { sport: 'american_football', season: '2026', competitionId: 'league', appearances: 1, passingYards: 240, passingTouchdowns: 2 });
  assert.equal(metrics.find((m) => m.key === 'passingYards')?.value, 240);
  assert.ok(!metrics.some((m) => m.key === 'rebounds' || m.key === 'goals'));
});
test('football totals respect home/away, draws and clean sheets', () => {
  const metrics = teamMetrics('football', team, [game(), game({ homeTeamId: 'away', awayTeamId: 'home', homeScore: 1, awayScore: 1 })]);
  const values = Object.fromEntries(metrics.map((m) => [m.key, m.value]));
  assert.deepEqual(values, { games: 2, wins: 1, losses: 0, draws: 1, goalsFor: 3, goalsAgainst: 1, goalDifference: 2, cleanSheets: 1 });
});
test('incomplete scores, live games, other teams and other competitions are excluded', () => {
  const metrics = teamMetrics('football', team, [game({ homeScore: undefined }), game({ status: 'live' }), game({ leagueId: 'another' }), game({ homeTeamId: 'other' })]);
  assert.deepEqual(metrics, []);
});
test('basketball averages use completed games instead of invented ratings', () => {
  const metrics = teamMetrics('basketball', team, [game({ homeScore: 100, awayScore: 90 }), game({ homeScore: 80, awayScore: 90 })]);
  assert.equal(metrics.find((m) => m.key === 'pointsPerGame')?.value, 90);
  assert.equal(metrics.find((m) => m.key === 'winPercentage')?.value, 50);
  assert.ok(!metrics.some((m) => m.key === 'goalsFor' || m.key === 'draws'));
});
test('NFL team score does not fabricate touchdowns or yardage', () => {
  const metrics = teamMetrics('american_football', team, [game({ homeScore: 21, awayScore: 14 })]);
  assert.equal(metrics.find((m) => m.key === 'pointDifference')?.value, 7);
  assert.ok(!metrics.some((m) => m.key === 'touchdowns' || m.key === 'goalsFor'));
});
test('no games remains unavailable rather than a fabricated losing record', () => {
  assert.deepEqual(teamMetrics('football', team, []), []);
  assert.deepEqual(playerMetrics('football'), []);
});
