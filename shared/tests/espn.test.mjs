import assert from 'node:assert/strict';
import { test } from 'node:test';
import { loadEventSummary, loadFootballSeasonSchedule, loadFootballStandings, loadSportsData } from '../espn.mjs';

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

test('Brasileirão fixture receives its inferred round when both teams agree', async (t) => {
  const fixture = (id, date, homeId, awayId) => ({
    id,
    date,
    season: { type: 13907, slug: `${year}-brasileiro-serie-a` },
    competitions: [{
      date,
      status: { type: { state: 'pre' } },
      competitors: [
        { id: homeId, homeAway: 'home', score: '0', team: { id: homeId, displayName: `Team ${homeId}` } },
        { id: awayId, homeAway: 'away', score: '0', team: { id: awayId, displayName: `Team ${awayId}` } },
      ],
    }],
  });
  const schedule = [
    fixture('one-a', `${year}-01-10T12:00:00Z`, 'a', 'b'),
    fixture('one-b', `${year}-01-10T15:00:00Z`, 'c', 'd'),
    fixture('two-a', `${year}-01-17T12:00:00Z`, 'a', 'c'),
    fixture('two-b', `${year}-01-17T15:00:00Z`, 'b', 'd'),
  ];
  t.mock.method(globalThis, 'fetch', async (input) => {
    const url = new URL(input);
    if (url.pathname.endsWith('/teams') || url.pathname.endsWith('/roster')) return Response.json({});
    if (url.pathname.endsWith('/scoreboard') && url.pathname.includes('/bra.1/')) {
      return Response.json({ events: url.searchParams.get('dates') === String(year) ? schedule : [schedule[3]] });
    }
    return Response.json({ events: [] });
  });

  const data = await loadSportsData();
  const match = data.events.find((item) => item.id === 'brasileirao-a-two-b');
  assert.equal(match.week, 2);
  assert.equal(match.roundLabel, 'Rodada 2');
});

test('Copa do Brasil fixtures show phase, leg, and first-leg aggregate', async (t) => {
  const fixture = (id, date, leg, home, away, homeAggregate, awayAggregate, homeGoals = '0', awayGoals = '0', state = 'pre') => ({
    id,
    date,
    season: { year, type: 14066, slug: 'semifinals' },
    competitions: [{
      date,
      leg: { value: leg, displayValue: leg === 1 ? '1st Leg' : '2nd Leg' },
      series: {
        title: 'Semifinals',
        competitors: [
          { id: home, aggregateScore: homeAggregate },
          { id: away, aggregateScore: awayAggregate },
        ],
      },
      status: { type: { state } },
      competitors: [
        { id: home, homeAway: 'home', score: homeGoals, team: { id: home, displayName: `Team ${home}` } },
        { id: away, homeAway: 'away', score: awayGoals, team: { id: away, displayName: `Team ${away}` } },
      ],
    }],
  });
  t.mock.method(globalThis, 'fetch', async (input) => {
    const url = new URL(input);
    if (url.pathname.endsWith('/teams') || url.pathname.endsWith('/roster')) return Response.json({});
    if (url.pathname.endsWith('/scoreboard') && url.pathname.includes('/bra.copa_do_brazil/')) {
      return Response.json({ events: [
        fixture('cup-first', `${year}-11-01T12:00:00Z`, 1, 'home', 'away', 0, 0),
        fixture('cup-second', `${year}-11-08T12:00:00Z`, 2, 'away', 'home', 1, 2),
        fixture('cup-live', `${year}-11-08T15:00:00Z`, 2, 'away', 'home', 3, 2, '2', '0', 'in'),
      ] });
    }
    return Response.json({ events: [] });
  });

  const data = await loadSportsData();
  const ida = data.events.find((item) => item.id === 'copa-do-brasil-cup-first');
  const volta = data.events.find((item) => item.id === 'copa-do-brasil-cup-second');
  const voltaAoVivo = data.events.find((item) => item.id === 'copa-do-brasil-cup-live');
  assert.equal(ida.roundLabel, 'Semifinal');
  assert.equal(ida.leg, 1);
  assert.equal(volta.roundLabel, 'Semifinal');
  assert.equal(volta.leg, 2);
  assert.equal(volta.aggregateHomeScore, 1);
  assert.equal(volta.aggregateAwayScore, 2);
  assert.equal(voltaAoVivo.aggregateHomeScore, 1);
  assert.equal(voltaAoVivo.aggregateAwayScore, 2);
});

test('Copa do Brasil season schedule includes all rounds and their teams', async (t) => {
  const requests = [];
  t.mock.method(globalThis, 'fetch', async (input) => {
    const url = new URL(input);
    requests.push(url);
    return Response.json({ events: [
      {
        id: 'final',
        date: `${year}-12-01T20:00:00Z`,
        season: { slug: 'final' },
        competitions: [{
          status: { type: { state: 'pre' } },
          competitors: [
            { homeAway: 'home', score: '0', team: { id: 'home', displayName: 'Mandante' } },
            { homeAway: 'away', score: '0', team: { id: 'away', displayName: 'Visitante' } },
          ],
        }],
      },
      {
        id: 'round-of-16',
        date: `${year}-08-01T20:00:00Z`,
        season: { slug: 'round-of-16' },
        competitions: [{
          status: { type: { state: 'post' } },
          competitors: [
            { homeAway: 'home', score: '2', team: { id: 'away', displayName: 'Visitante' } },
            { homeAway: 'away', score: '1', team: { id: 'home', displayName: 'Mandante' } },
          ],
        }],
      },
    ] });
  });

  const schedule = await loadFootballSeasonSchedule('copa-do-brasil');
  assert.equal(requests.length, 1);
  assert.equal(requests[0].searchParams.get('dates'), String(year));
  assert.equal(requests[0].searchParams.get('limit'), '1000');
  assert.deepEqual(schedule.events.map(({ roundLabel, status }) => ({ roundLabel, status })), [
    { roundLabel: 'Oitavas de final', status: 'finished' },
    { roundLabel: 'Final', status: 'scheduled' },
  ]);
  assert.deepEqual(schedule.teams.map(({ name }) => name).sort(), ['Mandante', 'Visitante']);
  await assert.rejects(loadFootballSeasonSchedule('invalid-league'), /Calendário indisponível/);
});

test('Brasileirão season schedule includes all fixtures grouped into inferred rounds', async (t) => {
  const requests = [];
  const fixture = (id, date, home, away, state = 'pre') => ({
    id,
    date,
    season: { slug: `${year}-brasileiro-serie-a` },
    competitions: [{
      date,
      status: { type: { state } },
      competitors: [
        { id: home, homeAway: 'home', score: state === 'post' ? '2' : '0', team: { id: home, displayName: `Team ${home}` } },
        { id: away, homeAway: 'away', score: state === 'post' ? '1' : '0', team: { id: away, displayName: `Team ${away}` } },
      ],
    }],
  });
  const fixtures = [
    fixture('r1-a', `${year}-01-10T12:00:00Z`, 'a', 'b'),
    fixture('r1-b', `${year}-01-10T15:00:00Z`, 'c', 'd'),
    fixture('r2-a', `${year}-01-17T12:00:00Z`, 'a', 'c', 'post'),
    fixture('r2-b', `${year}-01-17T15:00:00Z`, 'b', 'd', 'post'),
  ];
  t.mock.method(globalThis, 'fetch', async (input) => {
    const url = new URL(input);
    requests.push(url);
    assert.ok(url.pathname.includes('/bra.1/scoreboard'));
    return Response.json({ events: fixtures });
  });

  const schedule = await loadFootballSeasonSchedule('brasileirao-a');
  assert.equal(requests.length, 1);
  assert.equal(requests[0].searchParams.get('dates'), String(year));
  assert.deepEqual(schedule.events.map(({ week, roundLabel }) => ({ week, roundLabel })), [
    { week: 1, roundLabel: 'Rodada 1' },
    { week: 1, roundLabel: 'Rodada 1' },
    { week: 2, roundLabel: 'Rodada 2' },
    { week: 2, roundLabel: 'Rodada 2' },
  ]);
  assert.equal(schedule.teams.length, 4);
});

test('pre-match football summary does not report the scheduled score as goals', async (t) => {
  t.mock.method(globalThis, 'fetch', async () => Response.json({
    header: {
      competitions: [{
        status: { type: { state: 'pre' } },
        competitors: [
          { id: '1', homeAway: 'home', score: '0', team: { id: '1' } },
          { id: '2', homeAway: 'away', score: '0', team: { id: '2' } },
        ],
      }],
    },
  }));

  const summary = await loadEventSummary('brasileirao-a', 'brasileirao-a-match');
  assert.deepEqual(summary.statistics, []);
});

test('started football summary labels the fixture score as match goals', async (t) => {
  t.mock.method(globalThis, 'fetch', async () => Response.json({
    header: {
      competitions: [{
        status: { type: { state: 'in' } },
        competitors: [
          { id: '1', homeAway: 'home', score: '2', team: { id: '1' } },
          { id: '2', homeAway: 'away', score: '1', team: { id: '2' } },
        ],
      }],
    },
  }));

  const summary = await loadEventSummary('brasileirao-a', 'brasileirao-a-match');
  assert.deepEqual(summary.statistics[0], {
    key: 'goals',
    label: 'Gols na partida',
    homeValue: '2',
    awayValue: '1',
  });
});

test('Brazilian league standings count completed matches and ignore future fixtures', async (t) => {
  const kickoff = new Date(Date.now() - 60_000).toISOString();
  t.mock.method(globalThis, 'fetch', async (input) => {
    const url = new URL(input);
    assert.match(url.pathname, /\/soccer\/bra\.1\/scoreboard$/);
    assert.equal(url.searchParams.get('limit'), '1000');
    const fixture = (id, home, away, homeGoals, awayGoals, state = 'post', date = kickoff) => ({
      id,
      date,
      competitions: [{
        date,
        status: { type: { state } },
        competitors: [
          { homeAway: 'home', score: String(homeGoals), team: { id: home, displayName: `Team ${home}` } },
          { homeAway: 'away', score: String(awayGoals), team: { id: away, displayName: `Team ${away}` } },
        ],
      }],
    });
    return Response.json({ events: [
      fixture('1', 'a', 'b', 2, 0),
      fixture('2', 'b', 'c', 1, 1),
      fixture('3', 'c', 'a', 4, 0),
      fixture('4', 'a', 'c', 2, 0, 'pre', new Date(Date.now() + 60_000).toISOString()),
    ] });
  });

  const standings = await loadFootballStandings('brasileirao-a');
  assert.deepEqual(standings.map(({ teamId, points, played, position, wins, draws, losses, goalsFor, goalsAgainst }) => ({
    teamId, points, played, position, wins, draws, losses, goalsFor, goalsAgainst,
  })), [
    { teamId: 'brasileirao-a-c', points: 4, played: 2, position: 1, wins: 1, draws: 1, losses: 0, goalsFor: 5, goalsAgainst: 1 },
    { teamId: 'brasileirao-a-a', points: 3, played: 2, position: 2, wins: 1, draws: 0, losses: 1, goalsFor: 2, goalsAgainst: 4 },
    { teamId: 'brasileirao-a-b', points: 1, played: 2, position: 3, wins: 0, draws: 1, losses: 1, goalsFor: 1, goalsAgainst: 3 },
  ]);
});
