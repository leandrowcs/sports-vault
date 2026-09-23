const SITE = 'https://site.api.espn.com/apis/site/v2/sports/football/nfl';
const STANDINGS = 'https://site.api.espn.com/apis/v2/sports/football/nfl/standings';
const cache = new Map();
const phases = { 1: 'Pré-temporada', 2: 'Temporada regular', 3: 'Playoffs' };
const categoryLabels = { passing: 'Passe', rushing: 'Corrida', receiving: 'Recepção', miscellaneous: 'Eficiência e disciplina', defensive: 'Defesa', defensiveInterceptions: 'Interceptações defensivas', interceptions: 'Interceptações', general: 'Geral', fumbles: 'Fumbles', returning: 'Retornos', kickReturns: 'Retornos de kickoff', puntReturns: 'Retornos de punt', kicking: 'Chutes', punting: 'Punts', scoring: 'Pontuação' };

async function read(url) {
  const existing = cache.get(url);
  if (existing?.expires > Date.now()) return existing.promise;
  const promise = fetch(url, { signal: AbortSignal.timeout(12000), headers: { Accept: 'application/json' } }).then((r) => {
    if (!r.ok) throw new Error('Dados NFL indisponíveis na ESPN.');
    return r.json();
  }).catch((error) => { cache.delete(url); throw error; });
  if (cache.size >= 200) cache.delete(cache.keys().next().value);
  cache.set(url, { promise, expires: Date.now() + 60000 });
  return promise;
}

const display = (value) => String(value != null && typeof value === 'object' ? value.displayValue ?? value.value ?? '—' : value ?? '—');
export function nflTeam(team) {
  return { id: `nfl-${team.id}`, espnTeamId: String(team.id), leagueId: 'nfl', name: team.displayName,
    shortName: team.abbreviation ?? team.shortDisplayName, city: team.location ?? '', color: `#${team.color || '7c2d12'}`,
    logoUrl: team.logo ?? team.logos?.[0]?.href };
}

export function nflEvent(event) {
  const game = event.competitions?.[0];
  const home = game?.competitors?.find((c) => c.homeAway === 'home');
  const away = game?.competitors?.find((c) => c.homeAway === 'away');
  if (!home?.team || !away?.team) return null;
  const status = game.status ?? event.status;
  const state = status?.type?.state;
  const score = (side) => {
    const value = typeof side.score === 'object' ? side.score?.value : side.score;
    return state === 'pre' || value == null || value === '' || !Number.isFinite(Number(value)) ? undefined : Number(value);
  };
  const phase = Number(event.seasonType?.type ?? event.season?.type);
  return { id: `nfl-${event.id}`, leagueId: 'nfl', homeTeamId: `nfl-${home.team.id}`, awayTeamId: `nfl-${away.team.id}`,
    home: nflTeam(home.team), away: nflTeam(away.team), startsAt: event.date, venue: game.venue?.fullName ?? '',
    status: state === 'post' ? 'finished' : state === 'in' ? 'live' : 'scheduled', homeScore: score(home), awayScore: score(away),
    seasonYear: Number(event.season?.year), phase, seasonPhase: phases[phase], week: event.week?.number,
    shortStatus: status?.type?.shortDetail ?? status?.type?.description ?? '' };
}

export async function nflSeason() {
  const p = await read(`${SITE}/scoreboard`);
  const s = p.leagues?.[0]?.season;
  if (!Number.isInteger(s?.year)) throw new Error('Temporada NFL indisponível.');
  return { year: s.year, phase: s.type?.type ?? 2, week: p.week?.number ?? 1 };
}

export async function nflCalendar(year) {
  const p = await read(`${SITE}/scoreboard?dates=${year}&seasontype=2&week=1`);
  if (Number(p.leagues?.[0]?.season?.year) !== year) throw new Error('Calendário da temporada indisponível.');
  return (p.leagues?.[0]?.calendar ?? []).filter((c) => phases[c.value]).map((c) => ({
    phase: Number(c.value), label: phases[c.value], weeks: (c.entries ?? []).map((w) => ({
      number: Number(w.value), label: (w.label ?? `Semana ${w.value}`).replace('Preseason Week', 'Pré-temporada · Semana').replace('Week', 'Semana'),
      start: w.startDate, end: w.endDate,
    })),
  }));
}

export async function nflWeek(year, phase, week) {
  const p = await read(`${SITE}/scoreboard?dates=${year}&seasontype=${phase}&week=${week}&limit=100`);
  return (p.events ?? []).filter((e) => Number(e.season?.year) === year && Number(e.season?.type) === phase
    && Number(e.week?.number ?? p.week?.number) === week).map(nflEvent).filter(Boolean).sort((a, b) => a.startsAt.localeCompare(b.startsAt));
}

export async function nflGroups() {
  const p = await read(`${SITE}/teams?limit=100&enable=groups`);
  return (p.sports?.[0]?.leagues?.[0]?.groups ?? []).map((g) => ({ name: g.name, conference: g.name.split(' ')[0],
    logoUrl: g.logos?.[0]?.href, teams: (g.teams ?? []).map(nflTeam) }));
}

export function normalizeNflStandings(payload, groups, year) {
  const rows = (payload.children ?? []).flatMap((g) => {
    if (Number(g.standings?.season) !== year || Number(g.standings?.seasonType) !== 2) throw new Error('Classificação de outra temporada.');
    return (g.standings.entries ?? []).map((e) => ({ team: nflTeam(e.team),
      seed: Number(e.stats?.find((s) => s.name === 'playoffSeed')?.value) || null,
      stats: Object.fromEntries((e.stats ?? []).map((s) => [s.name, s.displayValue ?? s.summary ?? String(s.value ?? '—')])) }));
  });
  return groups.map((group) => ({ ...group, rows: rows.filter((r) => group.teams.some((t) => t.id === r.team.id))
    .sort((a, b) => (a.seed ?? Infinity) - (b.seed ?? Infinity)) }));
}

export async function nflStandings(year) {
  const [payload, groups] = await Promise.all([read(`${STANDINGS}?season=${year}&seasontype=2`), nflGroups()]);
  return normalizeNflStandings(payload, groups, year);
}

export function normalizeNflStatistics(payload, year) {
  const season = payload?.requestedSeason ?? payload?.season;
  if (Number(season?.year) !== year || Number(season?.type) !== 2) return [];
  return (payload.results?.stats?.categories ?? []).map((c) => ({ key: c.name, label: categoryLabels[c.name] ?? c.displayName ?? c.name,
    stats: [...new Map((c.stats ?? []).map((s) => [s.name, { key: s.name, label: s.displayName ?? s.shortDisplayName ?? s.name, value: display(s) }])).values()] }));
}

export async function nflTeamSeason(id, year, currentYear) {
  const warnings = [];
  const optional = async (label, action, fallback) => {
    try { return await action(); } catch { warnings.push(`${label} indisponível. Tente atualizar.`); return fallback; }
  };
  const [standings, stats, schedules, roster] = await Promise.all([
    optional('Campanha', () => nflStandings(year), []),
    optional('Estatísticas', () => read(`${SITE}/teams/${id}/statistics?season=${year}&seasontype=2`), null),
    Promise.all([1, 2, 3].map((phase) => optional(`Agenda · ${phases[phase]}`, () => read(`${SITE}/teams/${id}/schedule?season=${year}&seasontype=${phase}`), null))),
    year === currentYear ? optional('Elenco', () => read(`${SITE}/teams/${id}/roster?season=${year}`), null) : null,
  ]);
  const events = new Map();
  for (const [index, schedule] of schedules.entries()) for (const raw of schedule?.events ?? []) {
    if (Number(raw.season?.year) !== year || Number(raw.seasonType?.type ?? raw.season?.type) !== index + 1) continue;
    const e = nflEvent(raw);
    if (e) events.set(e.id, e);
  }
  const division = standings.find((g) => g.teams.some((t) => t.espnTeamId === id));
  const rosterLabels = { offense: 'Ataque', defense: 'Defesa', specialTeam: 'Special teams', injuredReserveOrOut: 'Reserva de lesionados / fora', suspended: 'Suspensos', practiceSquad: 'Equipe de treino' };
  const regular = schedules[1];
  return { year, warnings, division: division?.name, campaign: division?.rows.find((r) => r.team.espnTeamId === id) ?? null,
    byeWeek: Number((regular?.requestedSeason ?? regular?.season)?.year) === year ? regular?.byeWeek : undefined,
    statistics: normalizeNflStatistics(stats, year), events: [...events.values()].sort((a, b) => a.startsAt.localeCompare(b.startsAt)),
    roster: Number(roster?.season?.year) === year ? (roster.athletes ?? []).filter((g) => g.items?.length).map((g) => ({
      key: g.position, label: rosterLabels[g.position] ?? g.position, players: g.items.map((a) => ({ id: a.id, name: a.displayName,
        jersey: a.jersey ?? '—', position: a.position?.abbreviation ?? '—', age: a.age, height: a.displayHeight,
        weight: a.displayWeight, photo: a.headshot?.href, status: a.injuries?.[0]?.status ?? a.status?.name ?? '' })),
    })) : [] };
}

const gameLabels = { firstDowns: 'Primeiras descidas', totalYards: 'Jardas totais', netPassingYards: 'Jardas aéreas líquidas',
  completionAttempts: 'Passes completos / tentados', rushingYards: 'Jardas terrestres', rushingAttempts: 'Corridas',
  thirdDownEff: 'Conversões em 3ª descida', fourthDownEff: 'Conversões em 4ª descida', redZoneAttempts: 'Red zone',
  turnovers: 'Turnovers', interceptions: 'Interceptações lançadas', fumblesLost: 'Fumbles perdidos',
  sacksYardsLost: 'Sacks sofridos / jardas perdidas', totalPenaltiesYards: 'Penalidades / jardas', possessionTime: 'Tempo de posse' };

function touchdownCount(value) {
  const raw = value != null && typeof value === 'object' ? value.value ?? value.displayValue : value;
  if (raw == null || String(raw).trim() === '') return undefined;
  const number = Number(raw);
  return Number.isInteger(number) && number >= 0 ? number : undefined;
}

function touchdownStats(payload, sides, teamStats) {
  const counts = sides.map((side, index) => {
    const teamId = String(side.team.id);
    const stats = teamStats[index];
    const tables = payload.boxscore?.players?.find((g) => String(g.team.id) === teamId)?.statistics ?? [];
    const categoryTotal = (category, key) => {
      const direct = touchdownCount(stats.find((s) => s.name === key));
      if (direct !== undefined) return direct;
      const table = tables.find((t) => t.name === category);
      const keyIndex = table?.keys?.indexOf(key) ?? -1;
      const column = keyIndex >= 0 ? keyIndex : table?.labels?.indexOf('TD') ?? -1;
      return column >= 0 ? touchdownCount(table?.totals?.[column]) : undefined;
    };
    const passing = categoryTotal('passing', 'passingTouchdowns');
    const rushing = categoryTotal('rushing', 'rushingTouchdowns');
    const other = touchdownCount(stats.find((s) => s.name === 'defensiveTouchdowns'));
    let total = touchdownCount(stats.find((s) => s.name === 'totalTouchdowns' || s.name === 'touchdowns'));
    if (total === undefined && payload.scoringPlays?.length) {
      total = payload.scoringPlays.filter((play) => String(play.team?.id) === teamId && play.scoringType?.name === 'touchdown').length;
    }
    if (total === undefined && passing !== undefined && rushing !== undefined && other !== undefined) total = passing + rushing + other;
    return { total, passing, rushing, other };
  });
  return [['total', 'Touchdowns totais'], ['passing', 'Touchdowns aéreos'], ['rushing', 'Touchdowns terrestres'], ['other', 'Touchdowns de defesa / special teams']]
    .flatMap(([key, label]) => counts.every((c) => c[key] === undefined) ? [] : [{ key: `touchdowns-${key}`, label,
      homeValue: display(counts[0][key]), awayValue: display(counts[1][key]) }]);
}

export function normalizeNflGame(p) {
  const game = p.header?.competitions?.[0];
  const sides = ['home', 'away'].map((side) => game?.competitors?.find((c) => c.homeAway === side));
  if (sides.some((s) => !s?.team)) throw new Error('Partida NFL indisponível.');
  const pre = game.status?.type?.state === 'pre';
  const stats = sides.map((c) => p.boxscore?.teams?.find((t) => String(t.team.id) === String(c.team.id))?.statistics ?? []);
  return { year: p.header.season?.year, status: game.status?.type?.shortDetail ?? '', live: game.status?.type?.state === 'in',
    teams: sides.map((c) => ({ team: nflTeam(c.team), score: pre ? '—' : display(c.score),
      periods: (c.linescores ?? []).map(display) })),
    statistics: [...(pre ? [] : touchdownStats(p, sides, stats)), ...Object.entries(gameLabels).flatMap(([key, label]) => {
      const values = stats.map((list) => display(list.find((s) => s.name === key)));
      return values.every((v) => v === '—') ? [] : [{ key, label, homeValue: values[0], awayValue: values[1] }];
    })],
    players: (p.boxscore?.players ?? []).map((g) => ({ team: nflTeam(g.team), tables: (g.statistics ?? []).map((s) => ({
      key: s.name, label: categoryLabels[s.name] ?? s.text ?? s.name, labels: s.labels ?? s.names ?? [],
      players: (s.athletes ?? []).map((a) => ({ id: a.athlete.id, name: a.athlete.displayName,
        didNotPlay: !!a.didNotPlay, stats: (a.stats ?? []).map(display) })),
    })) })),
  };
}

export async function nflGame(id) { return normalizeNflGame(await read(`${SITE}/summary?event=${id}`)); }

export async function nflSuperBowl(year) {
  const calendar = await nflCalendar(year);
  const week = calendar.find((phase) => phase.phase === 3)?.weeks.find((entry) => /\bSuper\s*Bowl\b/i.test(entry.label));
  if (!week) return { event: null };
  const events = await nflWeek(year, 3, week.number);
  return { event: events.length === 1 ? events[0] : null };
}

export async function nflRequest(query) {
  const invalid = () => { throw Object.assign(new Error('Parâmetros NFL inválidos.'), { status: 400 }); };
  const types = ['nfl-season', 'nfl-calendar', 'nfl-standings', 'nfl-week', 'nfl-team', 'nfl-game', 'nfl-super-bowl'];
  if (!types.includes(query.type)) invalid();
  if (['nfl-game', 'nfl-team'].includes(query.type) && (typeof query.id !== 'string' || !/^\d{1,12}$/.test(query.id))) invalid();
  if (query.type === 'nfl-game') return nflGame(query.id);
  const season = await nflSeason();
  const year = query.year === undefined ? season.year : Number(query.year);
  if (![season.year, season.year - 1].includes(year)) invalid();
  if (query.type === 'nfl-season') return season;
  if (query.type === 'nfl-calendar') return nflCalendar(year);
  if (query.type === 'nfl-standings') return nflStandings(year);
  if (query.type === 'nfl-super-bowl') return nflSuperBowl(year);
  if (query.type === 'nfl-team') return nflTeamSeason(query.id, year, season.year);
  const phase = Number(query.phase), week = Number(query.week);
  if (![1, 2, 3].includes(phase) || !Number.isInteger(week) || week < 1 || week > 18) invalid();
  const calendar = await nflCalendar(year);
  if (!calendar.find((p) => p.phase === phase)?.weeks.some((w) => w.number === week)) invalid();
  return nflWeek(year, phase, week);
}
