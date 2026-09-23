import assert from 'node:assert/strict';
import { test } from 'node:test';
import { nbaFinals, normalizeNbaFinals } from '../nba.mjs';
import { nflSuperBowl, nflRequest } from '../nfl.mjs';

function game(id, { year = 2025, phase = 3, headline = 'East Finals', home = '1', away = '2', homeScore = '105', awayScore = '90', state = 'post' } = {}) {
  return { id: String(id), date: `2025-05-${String(10 + Number(id)).padStart(2, '0')}T23:00:00Z`, season: { year, type: phase },
    competitions: [{ notes: [{ headline }], status: { type: { state } }, competitors: [
      { homeAway: 'home', team: { id: home, displayName: `Team ${home}` }, score: homeScore },
      { homeAway: 'away', team: { id: away, displayName: `Team ${away}` }, score: awayScore },
    ] }] };
}

test('NBA finals count team wins across venue changes, deduplicate games and sort dates', () => {
  const first = game(1);
  const events = [game(5), game(4, { home: '2', away: '1', homeScore: '80', awayScore: '100' }), game(3, { homeScore: '80' }), game(2), first, first];
  const [east] = normalizeNbaFinals({ events }, 2025);
  assert.equal(east.champion.id, 'nba-1');
  assert.deepEqual(east.teams.map((side) => side.wins), [4, 1]);
  assert.deepEqual(east.games.map((event) => event.id), ['nba-1', 'nba-2', 'nba-3', 'nba-4', 'nba-5']);
});

test('NBA identifies both conference finals and NBA finals without including semifinals or other seasons', () => {
  const events = [game(1, { headline: 'Eastern Conference Finals' }), game(2, { headline: 'Western Conference Finals' }),
    game(3, { headline: 'NBA Finals - Game 1' }), game(4, { headline: 'East Semifinals' }),
    game(5, { year: 2024 }), game(6, { phase: 2 }), game(7, { headline: 'West 1st Round' })];
  const rounds = normalizeNbaFinals({ events }, 2025);
  assert.deepEqual(rounds.map((round) => round.games.map((event) => event.id)), [['nba-1'], ['nba-2'], ['nba-3']]);
  assert.ok(rounds.every((round) => round.champion === null));
});

test('NBA does not crown a champion from scheduled games, missing scores or tied scores', () => {
  const events = [game(1), game(2), game(3), game(4, { state: 'pre' }), game(5, { awayScore: null }), game(6, { awayScore: '105' })];
  const [east] = normalizeNbaFinals({ events }, 2025);
  assert.equal(east.champion, null);
  assert.equal(east.teams[0].wins, 3);
  assert.ok(normalizeNbaFinals({}, 2025).every((round) => round.games.length === 0 && round.champion === null));
});

test('NBA finals use daily scoreboards and both finalists schedules, never unsupported date ranges', async (t) => {
  const final = { ...game(7, { headline: 'NBA Finals - Game 7' }), date: '2025-06-22T23:00:00Z' };
  const schedules = [];
  t.mock.method(globalThis, 'fetch', async (input) => {
    const url = new URL(input);
    if (url.pathname.endsWith('/schedule')) {
      assert.equal(url.searchParams.get('season'), '2025');
      assert.equal(url.searchParams.get('seasontype'), '3');
      schedules.push(url.pathname);
      return Response.json({ events: [final, url.pathname.includes('/teams/1/') ? game(1) : game(2, { headline: 'West Finals' }), game(3, { year: 2024 })] });
    }
    const date = url.searchParams.get('dates');
    assert.match(date, /^\d{8}$/);
    if (date === '20250601') return Response.json({ leagues: [{ season: { year: 2025 }, calendar: ['2025-06-22T07:00Z'] }] });
    assert.equal(date, '20250622');
    return Response.json({ events: [final] });
  });
  const rounds = await nbaFinals(2025);
  assert.deepEqual(rounds.map((round) => round.games.map((event) => event.id)), [['nba-1'], ['nba-2'], ['nba-7']]);
  assert.equal(schedules.length, 2);
  assert.notEqual(schedules[0], schedules[1]);
});

test('NBA finals return empty rounds when the season has no completed games', async (t) => {
  t.mock.method(globalThis, 'fetch', async () => Response.json({ leagues: [{ season: { year: 2022 }, calendar: [] }] }));
  assert.ok((await nbaFinals(2022)).every((round) => round.games.length === 0 && round.champion === null));
});

test('NBA finals preserve upstream errors so retry can recover without showing false empty results', async (t) => {
  let calls = 0;
  t.mock.method(globalThis, 'fetch', async () => {
    calls += 1;
    return calls === 1 ? new Response('', { status: 502 }) : Response.json({ leagues: [{ season: { year: 2021 }, calendar: [] }] });
  });
  await assert.rejects(() => nbaFinals(2021), /ESPN/);
  assert.ok((await nbaFinals(2021)).every((round) => round.games.length === 0));
  assert.equal(calls, 2);
});

test('Super Bowl uses the named playoff week, excludes Pro Bowl and preserves the season year', async (t) => {
  const requests = [];
  t.mock.method(globalThis, 'fetch', async (input) => {
    const url = new URL(input);
    requests.push(url);
    if (url.searchParams.get('seasontype') === '2') return Response.json({ leagues: [{ season: { year: 2025 }, calendar: [{ value: '3', entries: [
      { value: '4', label: 'Pro Bowl' }, { value: '5', label: 'Super Bowl' },
    ] }] }] });
    assert.equal(url.searchParams.get('week'), '5');
    const final = { ...game(1), date: '2026-02-09T00:00:00Z', week: { number: 5 } };
    return Response.json({ events: [final, { ...game(2, { year: 2024 }), week: { number: 5 } }, { ...game(3), week: { number: 4 } }] });
  });
  const { event } = await nflSuperBowl(2025);
  assert.equal(event.id, 'nfl-1');
  assert.equal(event.seasonYear, 2025);
  assert.match(event.startsAt, /^2026-/);
  assert.equal(requests.length, 2);
});

test('Super Bowl returns empty when the calendar has no final rather than using the last week', async (t) => {
  t.mock.method(globalThis, 'fetch', async () => Response.json({ leagues: [{ season: { year: 2024 }, calendar: [{ value: '3', entries: [{ value: '4', label: 'Pro Bowl' }] }] }] }));
  assert.deepEqual(await nflSuperBowl(2024), { event: null });
});

test('Super Bowl rejects a calendar from another season', async (t) => {
  t.mock.method(globalThis, 'fetch', async () => Response.json({ leagues: [{ season: { year: 2025 } }] }));
  await assert.rejects(() => nflSuperBowl(2023), /temporada/);
});

test('NFL finals route accepts previous season and rejects out-of-range seasons', async (t) => {
  t.mock.method(globalThis, 'fetch', async (input) => {
    const url = new URL(input);
    if (!url.searchParams.has('dates')) return Response.json({ leagues: [{ season: { year: 2029 } }] });
    if (url.searchParams.get('seasontype') === '2') return Response.json({ leagues: [{ season: { year: 2028 }, calendar: [{ value: '3', entries: [{ value: '5', label: 'Super Bowl' }] }] }] });
    return Response.json({ events: [{ ...game(1, { year: 2028 }), week: { number: 5 } }] });
  });
  assert.equal((await nflRequest({ type: 'nfl-super-bowl', year: '2028' })).event.id, 'nfl-1');
  await assert.rejects(() => nflRequest({ type: 'nfl-super-bowl', year: '2020' }), { status: 400 });
});
