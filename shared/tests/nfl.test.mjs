import assert from 'node:assert/strict';
import { test } from 'node:test';
import { nflEvent, normalizeNflGame, normalizeNflStandings, normalizeNflStatistics } from '../nfl.mjs';

const team = (id) => ({ id, displayName: `Team ${id}`, abbreviation: `T${id}` });
const event = (year = 2025, phase = 2, week = 1) => ({ id: '100', date: '2025-09-06T00:00Z', season: { year, type: phase }, week: { number: week },
  competitions: [{ status: { type: { state: 'post' } }, competitors: [
    { homeAway: 'away', team: team('1'), score: { value: 21 } },
    { homeAway: 'home', team: team('2'), score: '27' },
  ] }] });

test('NFL scores support strings and objects, preserving absent scores and pregame state', () => {
  const raw = event();
  assert.equal(nflEvent(raw).homeScore, 27);
  assert.equal(nflEvent(raw).awayScore, 21);
  delete raw.competitions[0].competitors[0].score;
  assert.equal(nflEvent(raw).awayScore, undefined);
  raw.competitions[0].status.type.state = 'pre';
  assert.equal(nflEvent(raw).homeScore, undefined);
  assert.equal(nflEvent({}), null);
});

test('division standings preserve ESPN seeds and reject another season or phase', () => {
  const entries = ['1', '2', '3'].map((id, index) => ({ team: team(id), stats: [{ name: 'playoffSeed', value: [5, 2, 1][index] }] }));
  const payload = { children: [{ standings: { season: 2025, seasonType: 2, entries } }] };
  const groups = [{ name: 'AFC West', teams: [{ id: 'nfl-1' }, { id: 'nfl-2' }] }, { name: 'AFC East', teams: [{ id: 'nfl-3' }] }];
  const divisions = normalizeNflStandings(payload, groups, 2025);
  assert.deepEqual(divisions[0].rows.map((r) => [r.team.id, r.seed]), [['nfl-2', 2], ['nfl-1', 5]]);
  assert.equal(divisions[1].rows.length, 1);
  assert.throws(() => normalizeNflStandings(payload, groups, 2026));
  payload.children[0].standings.seasonType = 1;
  assert.throws(() => normalizeNflStandings(payload, groups, 2025));
});

test('statistics honor requestedSeason and keep sacks in their respective categories', () => {
  const raw = { season: { year: 2026, type: 2 }, requestedSeason: { year: 2025, type: 2 }, results: { stats: { categories: [
    { name: 'passing', stats: [{ name: 'sacks', value: 30 }, { name: 'missing' }] },
    { name: 'defensive', stats: [{ name: 'sacks', value: 42 }] },
  ] } } };
  const groups = normalizeNflStatistics(raw, 2025);
  assert.equal(groups[0].stats[0].value, '30');
  assert.equal(groups[1].stats[0].value, '42');
  assert.equal(groups[0].stats[1].value, '—');
  assert.deepEqual(normalizeNflStatistics(raw, 2026), []);
});

test('game associates reversed boxscore teams by ID and retains overtime and player categories', () => {
  const raw = event();
  raw.competitions[0].competitors[1].linescores = [7, 6, 7, 7, 3].map((value) => ({ value }));
  const game = normalizeNflGame({ header: { season: { year: 2025 }, competitions: raw.competitions },
    boxscore: { teams: [{ team: team('1'), statistics: [{ name: 'netPassingYards', displayValue: '249' }] }, { team: team('2'), statistics: [{ name: 'netPassingYards', displayValue: '304' }] }],
      players: [{ team: team('1'), statistics: [{ name: 'passing', labels: ['YDS', 'TD'], athletes: [{ athlete: { id: '10', displayName: 'QB' }, stats: ['258', '1'] }] },
        { name: 'rushing', labels: ['YDS'], athletes: [{ athlete: { id: '11', displayName: 'RB' }, didNotPlay: true }] }] }] } });
  assert.equal(game.teams[0].team.id, 'nfl-2');
  assert.deepEqual(game.teams[0].periods, ['7', '6', '7', '7', '3']);
  assert.equal(game.statistics[0].homeValue, '304');
  assert.equal(game.statistics[0].awayValue, '249');
  assert.equal(game.players[0].tables.length, 2);
  assert.equal(game.players[0].tables[1].players[0].didNotPlay, true);
});

test('pregame has no invented score and missing boxscore remains empty', () => {
  const raw = event(); raw.competitions[0].status.type.state = 'pre';
  const game = normalizeNflGame({ header: { season: { year: 2025 }, competitions: raw.competitions } });
  assert.equal(game.teams[0].score, '—');
  assert.deepEqual(game.statistics, []);
  assert.deepEqual(game.players, []);
});

test('weekly queries isolate year, phase and week', async (t) => {
  const nfl = await import(`../nfl.mjs?week-test`);
  t.mock.method(globalThis, 'fetch', async () => Response.json({ events: [event(), event(2024), event(2025, 1), event(2025, 2, 2)] }));
  const events = await nfl.nflWeek(2025, 2, 1);
  assert.equal(events.length, 1);
  assert.equal(events[0].seasonYear, 2025);
});

test('touchdowns use category totals without double counting receptions, and include return scores', () => {
  const raw = event();
  const table = (name, key, total) => ({ name, keys: ['yards', key], labels: ['YDS', 'TD'], totals: ['100', total] });
  const payload = { header: { competitions: raw.competitions }, boxscore: {
    teams: [{ team: team('1'), statistics: [{ name: 'defensiveTouchdowns', value: 1 }] }, { team: team('2'), statistics: [{ name: 'defensiveTouchdowns', value: 0 }] }],
    players: [{ team: team('1'), statistics: [table('passing', 'passingTouchdowns', '2'), table('rushing', 'rushingTouchdowns', '1'), table('receiving', 'receivingTouchdowns', '2')] },
      { team: team('2'), statistics: [table('passing', 'passingTouchdowns', '0'), table('rushing', 'rushingTouchdowns', '2')] }],
  } };
  const stats = normalizeNflGame(payload).statistics;
  assert.deepEqual(stats.map((s) => [s.key, s.homeValue, s.awayValue]), [
    ['touchdowns-total', '2', '4'], ['touchdowns-passing', '0', '2'], ['touchdowns-rushing', '2', '1'], ['touchdowns-other', '0', '1'],
  ]);
  payload.boxscore.players[0].statistics[0].totals[1] = '--';
  const partial = normalizeNflGame(payload).statistics;
  assert.equal(partial.find((s) => s.key === 'touchdowns-passing').awayValue, '—');
  assert.equal(partial.find((s) => s.key === 'touchdowns-total').awayValue, '—');
});

test('touchdown total includes scoring plays beyond passing/rushing and excludes field goals and conversions', () => {
  const raw = event();
  const scoringPlays = ['touchdown', 'touchdown', 'field-goal', 'two-point-conversion'].map((name) => ({ team: { id: '2' }, scoringType: { name } }));
  const payload = { header: { competitions: raw.competitions }, scoringPlays };
  const stats = normalizeNflGame(payload).statistics;
  assert.equal(stats[0].homeValue, '2');
  assert.equal(stats[0].awayValue, '0');
  raw.competitions[0].status.type.state = 'pre';
  assert.deepEqual(normalizeNflGame(payload).statistics, []);
});

test('historical team data excludes current rosters and unrelated seasons, tolerating partial failure', async (t) => {
  const nfl = await import(`../nfl.mjs?team-test`);
  const paths = [];
  t.mock.method(globalThis, 'fetch', async (input) => {
    const url = new URL(input); paths.push(url.pathname);
    if (url.pathname.endsWith('/standings')) return new Response('', { status: 503 });
    if (url.pathname.endsWith('/teams')) return Response.json({ sports: [{ leagues: [{ groups: [] }] }] });
    if (url.pathname.endsWith('/statistics')) return Response.json({ requestedSeason: { year: 2025, type: 2 }, results: { stats: { categories: [] } } });
    const phase = Number(url.searchParams.get('seasontype'));
    return Response.json({ season: { year: 2026 }, requestedSeason: { year: 2025 }, byeWeek: 10,
      events: phase === 2 ? [event(), event(2026)] : [] });
  });
  const result = await nfl.nflTeamSeason('1', 2025, 2026);
  assert.equal(result.events.length, 1);
  assert.equal(result.byeWeek, 10);
  assert.equal(result.warnings.length, 1);
  assert.deepEqual(result.roster, []);
  assert.ok(!paths.some((p) => p.endsWith('/roster')));
});

test('NFL request rejects invalid IDs and unavailable calendar weeks', async (t) => {
  const nfl = await import(`../nfl.mjs?request-test`);
  t.mock.method(globalThis, 'fetch', async () => Response.json({ leagues: [{ season: { year: 2026, type: { type: 2 } }, calendar: [{ value: '2', entries: [{ value: '1' }] }] }], week: { number: 1 } }));
  await assert.rejects(nfl.nflRequest({ type: 'nfl-game', id: '../other' }), { status: 400 });
  await assert.rejects(nfl.nflRequest({ type: 'nfl-week', year: '2026', phase: '2', week: '19' }), { status: 400 });
  await assert.rejects(nfl.nflRequest({ type: 'nfl-week', year: '2026', phase: '2', week: '2' }), { status: 400 });
  await assert.rejects(nfl.nflRequest({ type: 'nfl-standings', year: '2020' }), { status: 400 });
});
