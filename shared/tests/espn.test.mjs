import assert from 'node:assert/strict';
import { test } from 'node:test';
import { loadSportsData } from '../espn.mjs';

const year = new Date().getUTCFullYear();
function event(id, date, teamId = '205', state = 'pre') {
  return {
    id, date,
    competitions: [{
      status: { type: { state } },
      competitors: [
        { homeAway: 'home', score: '2', team: { id: teamId, displayName: 'Home' } },
        { homeAway: 'away', score: '1', team: { id: '206', displayName: 'Away' } },
      ],
    }],
  };
}

test('Brazil includes World Cup and future friendlies without stale defaults or global truncation', async (t) => {
  const requests = [];
  t.mock.method(globalThis, 'fetch', async (input) => {
    const url = new URL(input);
    requests.push(url);
    if (!url.pathname.endsWith('/scoreboard')) return Response.json({});
    if (url.pathname.includes('/nba/')) return Response.json({ events: Array.from({ length: 170 }, (_, i) => event(`nba-${i}`, `${year}-01-01T12:00:00Z`, '1')) });
    if (url.pathname.includes('/fifa.world/')) return Response.json({ events: [event('world', `${year}-06-13T22:00:00Z`, '205', 'post')] });
    if (url.pathname.includes('/fifa.friendly/')) return Response.json({ events: [
      event('friendly', `${year}-11-14T10:00:00Z`),
      event('next-year', `${year + 1}-03-14T10:00:00Z`),
      event('old', `${year - 1}-09-14T10:00:00Z`),
      event('other-country', `${year}-11-14T10:00:00Z`, '202'),
    ] });
    return Response.json({ events: [] });
  });
  const data = await loadSportsData();
  const brazil = data.events.filter((item) => ['copa-do-mundo', 'amistosos-internacionais'].includes(item.leagueId));
  assert.deepEqual(brazil.map((item) => item.id), ['copa-do-mundo-world', 'amistosos-internacionais-friendly', 'amistosos-internacionais-next-year']);
  assert.equal(brazil[0].status, 'finished');
  assert.equal(brazil[1].status, 'scheduled');
  assert.equal(data.events.length, 173);
  for (const item of brazil) {
    assert.ok(data.teams.some((team) => team.id === item.homeTeamId));
    assert.ok(data.teams.some((team) => team.id === item.awayTeamId));
  }
  const nationalRequests = requests.filter((url) => /fifa\.|conmebol\.america/.test(url.pathname) && url.pathname.endsWith('/scoreboard'));
  assert.equal(nationalRequests.length, 8);
  assert.ok(nationalRequests.every((url) => [String(year), String(year + 1)].includes(url.searchParams.get('dates')) && url.searchParams.get('limit') === '1000'));
});

test('browser fallback derives Brazil and opponents from annual scoreboards', async (t) => {
  const previousWindow = globalThis.window;
  globalThis.window = {};
  t.after(() => { if (previousWindow === undefined) delete globalThis.window; else globalThis.window = previousWindow; });
  t.mock.method(globalThis, 'fetch', async (input) => {
    const url = new URL(input);
    assert.ok(!url.pathname.endsWith('/teams'));
    if (url.pathname.includes('/fifa.friendly/') && url.searchParams.get('dates') === String(year)) {
      return Response.json({ events: [event('upcoming', `${year}-11-14T10:00:00Z`)] });
    }
    return Response.json({ events: [] });
  });
  const data = await loadSportsData();
  assert.equal(data.events[0].id, 'amistosos-internacionais-upcoming');
  assert.equal(data.teams.length, 2);
});
