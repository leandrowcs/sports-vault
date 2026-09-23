import assert from 'node:assert/strict';
import { test } from 'node:test';
import { nbaCalendar, nbaEvent, nbaLastGameDate, nbaTeamConferences, nbaTeamSeason, normalizeNbaGame, normalizeStandings } from '../nba.mjs';

test('previous season date skips unplayed fixtures and uses the local game date', async (t) => {
  t.mock.method(globalThis, 'fetch', async (input) => {
    const date = new URL(input).searchParams.get('dates');
    if (date === '20240601') return Response.json({ leagues: [{ season: { year: 2024 }, calendar: ['2024-06-14T07:00Z', '2024-06-15T07:00Z'] }] });
    return Response.json({ events: [{ id: date, date: date === '20240614' ? '2024-06-15T01:00:00Z' : '2024-06-16T01:00:00Z', season: { year: 2024 }, competitions: [{ status: { type: { state: date === '20240614' ? 'post' : 'pre' } }, competitors: [
      { homeAway: 'home', team: { id: '1', displayName: 'Home' }, score: '105' },
      { homeAway: 'away', team: { id: '2', displayName: 'Away' }, score: '99' },
    ] }] }] });
  });
  assert.deepEqual(await nbaLastGameDate(2024), { date: '2024-06-14' });
});

test('team conference filters use divisions even before standings are published', async (t) => {
  t.mock.method(globalThis, 'fetch', async () => Response.json({ sports: [{ leagues: [{ groups: [
    { name: 'Atlantic', teams: [{ id: '2', displayName: 'Boston Celtics' }] },
    { name: 'Pacific', teams: [{ id: '13', displayName: 'Los Angeles Lakers' }] },
  ] }] }] }));
  const groups = await nbaTeamConferences();
  assert.deepEqual(groups.map((group) => [group.name, group.teams.map((team) => team.id)]), [['Leste', ['nba-2']], ['Oeste', ['nba-13']]]);
});

test('weekly calendar aggregates seven daily queries across year boundaries', async (t) => {
  const dates = [];
  t.mock.method(globalThis, 'fetch', async (input) => {
    const date = new URL(input).searchParams.get('dates');
    assert.match(date, /^\d{8}$/);
    dates.push(date);
    return Response.json({ events: [] });
  });
  assert.deepEqual(await nbaCalendar(2027, '2026-12-28', '2027-01-03'), []);
  assert.deepEqual(dates.sort(), ['20261228', '20261229', '20261230', '20261231', '20270101', '20270102', '20270103']);
});

const team = (id) => ({ id, displayName: `Team ${id}`, abbreviation: `T${id}` });

test('standings reject stale seasons and preseason tables', () => {
  const payload = (season, seasonType) => ({ children: [{ abbreviation: 'East', standings: { season, seasonType, entries: [{ team: team('2'), stats: [{ name: 'wins', displayValue: '61' }] }] } }] });
  assert.throws(() => normalizeStandings(payload(2024, 2), 2025));
  assert.throws(() => normalizeStandings(payload(2025, 1), 2025));
  const result = normalizeStandings(payload(2025, 2), 2025);
  assert.equal(result[0].name, 'Leste');
  assert.equal(result[0].rows[0].stats.wins, '61');
  assert.equal(result[0].rows[0].stats.losses, undefined);
});

test('calendar supports schedule score objects without inventing absent scores', () => {
  const input = { id: '1', season: { year: 2025 }, competitions: [{ status: { type: { state: 'post' } }, competitors: [
    { homeAway: 'away', team: team('1'), score: { value: 90 } },
    { homeAway: 'home', team: team('2') },
  ] }] };
  const event = nbaEvent(input);
  assert.equal(event.homeTeamId, 'nba-2');
  assert.equal(event.awayScore, 90);
  assert.equal(event.homeScore, undefined);
  assert.equal(nbaEvent({}), null);
});

test('conference position uses provider seed instead of raw entry ordering', () => {
  const payload = { children: [{ abbreviation: 'West', standings: { season: 2026, seasonType: 2, entries: [6, 1, 3].map((seed) => ({ team: team(String(seed)), stats: [{ name: 'playoffSeed', value: seed, displayValue: String(seed) }] })) } }] };
  assert.deepEqual(normalizeStandings(payload, 2026)[0].rows.map((row) => row.position), [1, 3, 6]);
});

test('game preserves overtime and DNP, matches collective stats by team ID', () => {
  const game = normalizeNbaGame({ header: { season: { year: 2025 }, competitions: [{ competitors: [
    { homeAway: 'away', team: team('1'), score: '112', linescores: [{ value: 20 }] },
    { homeAway: 'home', team: team('2'), score: '115', linescores: [20, 25, 30, 30, 10].map((value) => ({ value })) },
  ] }] }, boxscore: { teams: [
    { team: team('1'), statistics: [{ name: 'totalTurnovers', displayValue: '12' }] },
    { team: team('2'), statistics: [{ name: 'turnovers', displayValue: '8' }, { name: 'totalTurnovers', displayValue: '10' }] },
  ], players: [{ team: team('1'), statistics: [{ labels: ['PTS'], athletes: [{ athlete: { id: '7', displayName: 'Player' }, didNotPlay: true }] }] }] } });
  assert.equal(game.teams[0].periods.length, 5);
  assert.equal(game.teams[0].periods[4], '10');
  assert.deepEqual(game.statistics, [{ key: 'totalTurnovers', label: 'Turnovers totais', homeValue: '10', awayValue: '12' }]);
  assert.equal(game.players[0].tables[0].players[0].didNotPlay, true);
  assert.deepEqual(game.players[0].tables[0].players[0].stats, []);
});

test('previous team season ignores current metadata and never fetches current roster', async (t) => {
  const calls = [];
  t.mock.method(globalThis, 'fetch', async (input) => {
    const url = new URL(input); calls.push(url);
    if (url.pathname.endsWith('/standings')) return Response.json({ children: [] });
    if (url.pathname.endsWith('/statistics')) return Response.json({ season: { year: 2027, type: 1 }, requestedSeason: { year: 2025, type: 2 }, results: { stats: { categories: [{ stats: [{ name: 'gamesPlayed', value: 82 }, { name: 'avgPoints', displayValue: '116.3' }] }] } } });
    if (url.pathname.endsWith('/schedule')) return Response.json({ season: { year: 2027 }, events: [2025, 2027].map((year) => ({ id: String(year), season: { year }, date: `${year}-01-01`, competitions: [{ competitors: [{ homeAway: 'home', team: team('2') }, { homeAway: 'away', team: team('1') }] }] })) });
    throw new Error('Unexpected endpoint');
  });
  const result = await nbaTeamSeason('2', 2025, 2027);
  assert.equal(result.averages[0].value, '116.3');
  assert.equal(result.events.length, 1);
  assert.equal(result.events[0].seasonYear, 2025);
  assert.deepEqual(result.roster, []);
  assert.ok(calls.every((url) => !url.pathname.endsWith('/roster')));
});
