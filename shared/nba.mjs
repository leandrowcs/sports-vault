const SITE = 'https://site.api.espn.com/apis/site/v2/sports/basketball/nba';
const STANDINGS = 'https://site.api.espn.com/apis/v2/sports/basketball/nba/standings';
const cache = new Map();

async function read(url, allowMissing = false) {
  const cached = cache.get(url);
  if (cached && cached.expires > Date.now()) return cached.promise;
  const promise = fetch(url, { headers: { Accept: 'application/json' }, signal: AbortSignal.timeout(12000) })
    .then(async (response) => {
      if (allowMissing && response.status === 404) return null;
      if (!response.ok) throw new Error('Não foi possível consultar a ESPN.');
      return response.json();
    }).catch((error) => { cache.delete(url); throw error; });
  if (cache.size > 200) cache.delete(cache.keys().next().value);
  cache.set(url, { promise, expires: Date.now() + 60000 });
  return promise;
}

export function nbaTeam(team) {
  return { id: `nba-${team.id}`, espnTeamId: String(team.id), leagueId: 'nba', name: team.displayName,
    shortName: team.abbreviation, city: team.location ?? '', color: `#${team.color || 'ea580c'}`,
    logoUrl: team.logo ?? team.logos?.[0]?.href };
}

export function nbaEvent(event) {
  const game = event.competitions?.[0];
  const home = game?.competitors?.find((c) => c.homeAway === 'home');
  const away = game?.competitors?.find((c) => c.homeAway === 'away');
  if (!home?.team || !away?.team) return null;
  const score = (c) => {
    const value = typeof c.score === 'object' ? c.score?.value : c.score;
    return value == null || value === '' || !Number.isFinite(Number(value)) ? undefined : Number(value);
  };
  const state = game.status?.type?.state;
  return { id: `nba-${event.id}`, leagueId: 'nba', homeTeamId: `nba-${home.team.id}`, awayTeamId: `nba-${away.team.id}`,
    home: nbaTeam(home.team), away: nbaTeam(away.team), startsAt: event.date,
    status: state === 'post' ? 'finished' : state === 'in' ? 'live' : 'scheduled',
    homeScore: state === 'pre' ? undefined : score(home), awayScore: state === 'pre' ? undefined : score(away),
    venue: game.venue?.fullName ?? '', seasonYear: event.season?.year,
    seasonPhase: ({ 1: 'Pré-temporada', 2: 'Temporada regular', 3: 'Playoffs' })[event.seasonType?.type ?? event.season?.type],
    shortStatus: state === 'pre' ? 'Agendado' : game.status?.type?.shortDetail ?? '' };
}

export async function nbaSeason() {
  const payload = await read(`${SITE}/scoreboard`);
  const season = payload.leagues?.[0]?.season;
  if (!Number.isInteger(season?.year)) throw new Error('Temporada NBA indisponível.');
  return { year: season.year, label: season.displayName, phase: season.type?.type ?? 2 };
}

export async function nbaTeams() {
  const payload = await read(`${SITE}/teams?limit=100`);
  return (payload.sports?.[0]?.leagues?.[0]?.teams ?? []).map((item) => nbaTeam(item.team));
}

export async function nbaTeamConferences() {
  const payload = await read(`${SITE}/teams?limit=100&enable=groups`);
  const groups = payload.sports?.[0]?.leagues?.[0]?.groups ?? [];
  const divisions = { Atlantic: 'Leste', Central: 'Leste', Southeast: 'Leste', Northwest: 'Oeste', Pacific: 'Oeste', Southwest: 'Oeste' };
  return ['Leste', 'Oeste'].map((name) => ({ name, teams: groups.filter((group) => divisions[group.name] === name)
    .flatMap((group) => group.teams ?? []).map(nbaTeam).sort((a, b) => a.name.localeCompare(b.name)) }));
}

export async function nbaLastGameDate(year) {
  const payload = await read(`${SITE}/scoreboard?dates=${year}0601`);
  const league = payload.leagues?.[0];
  if (Number(league?.season?.year) !== year) throw new Error('Calendário da temporada indisponível.');
  const dates = [...new Set((league.calendar ?? []).filter((value) => Date.parse(value) <= Date.now()).map((value) => value.slice(0, 10)))].sort().reverse();
  for (let offset = 0; offset < dates.length; offset += 5) {
    const days = await Promise.all(dates.slice(offset, offset + 5).map((date) => nbaCalendar(year, date)));
    const last = days.flat().filter((event) => event.status === 'finished' && event.homeScore !== undefined && event.awayScore !== undefined)
      .sort((a, b) => b.startsAt.localeCompare(a.startsAt))[0];
    if (last) return { date: new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Toronto', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(last.startsAt)) };
  }
  return { date: null };
}

export function normalizeStandings(payload, year) {
  return (payload.children ?? []).map((group) => {
    const table = group.standings;
    if (Number(table?.season) !== year || Number(table?.seasonType) !== 2) {
      throw new Error('Classificação da temporada solicitada indisponível.');
    }
    return { name: group.abbreviation === 'East' ? 'Leste' : group.abbreviation === 'West' ? 'Oeste' : group.name,
      rows: (table.entries ?? []).map((entry, index) => ({ team: nbaTeam(entry.team),
        position: Number(entry.stats?.find((s) => s.name === 'playoffSeed')?.value) || index + 1,
        stats: Object.fromEntries((entry.stats ?? []).map((s) => [s.name, s.displayValue ?? s.summary ?? String(s.value ?? '—')])) }))
        .sort((a, b) => a.position - b.position) };
  });
}

export async function nbaStandings(year) {
  return normalizeStandings(await read(`${STANDINGS}?season=${year}&seasontype=2`), year);
}

export async function nbaCalendar(year, date, endDate) {
  if (endDate) {
    const dates = [];
    const cursor = new Date(`${date}T12:00:00Z`);
    while (cursor.toISOString().slice(0, 10) <= endDate && dates.length < 7) {
      dates.push(cursor.toISOString().slice(0, 10));
      cursor.setUTCDate(cursor.getUTCDate() + 1);
    }
    const days = await Promise.all(dates.map((day) => nbaCalendar(year, day)));
    return [...new Map(days.flat().map((event) => [event.id, event])).values()].sort((a, b) => a.startsAt.localeCompare(b.startsAt));
  }
  const payload = await read(`${SITE}/scoreboard?dates=${date.replaceAll('-', '')}&limit=100`);
  return (payload.events ?? []).filter((e) => Number(e.season?.year) === year).map(nbaEvent).filter(Boolean);
}

const averageLabels = { avgPoints: 'Pontos', avgRebounds: 'Rebotes', avgAssists: 'Assistências', avgSteals: 'Roubos',
  avgBlocks: 'Tocos', avgTurnovers: 'Turnovers', avgOffensiveRebounds: 'Rebotes ofensivos', avgDefensiveRebounds: 'Rebotes defensivos',
  fieldGoalPct: 'Quadra %', threePointFieldGoalPct: '3 pontos %', freeThrowPct: 'Lances livres %' };

export async function nbaTeamSeason(teamId, year, currentYear) {
  const warnings = [];
  const optional = async (label, action, fallback) => {
    try { return await action(); } catch { warnings.push(`${label} indisponível. Tente atualizar.`); return fallback; }
  };
  const [standings, statistics, schedules, roster] = await Promise.all([
    optional('Campanha', () => nbaStandings(year), []),
    optional('Estatísticas', () => read(`${SITE}/teams/${teamId}/statistics?season=${year}&seasontype=2`, true), null),
    Promise.all([1, 2, 3].map((phase) => optional(`Agenda · ${({ 1: 'pré-temporada', 2: 'temporada regular', 3: 'playoffs' })[phase]}`,
      () => read(`${SITE}/teams/${teamId}/schedule?season=${year}&seasontype=${phase}`), null))),
    year === currentYear ? optional('Elenco', () => read(`${SITE}/teams/${teamId}/roster?season=${year}`), null) : null,
  ]);
  const statsYear = statistics?.requestedSeason?.year ?? statistics?.season?.year;
  const statsPhase = statistics?.requestedSeason?.type ?? statistics?.season?.type;
  const categories = Number(statsYear) === year && Number(statsPhase) === 2 ? statistics?.results?.stats?.categories ?? [] : [];
  const stats = categories.flatMap((c) => c.stats ?? []);
  const played = stats.find((s) => s.name === 'gamesPlayed')?.value;
  const averages = played > 0 ? stats.filter((s) => averageLabels[s.name]).map((s) => ({ key: s.name, label: averageLabels[s.name], value: s.displayValue ?? String(s.value) })) : [];
  const events = new Map();
  for (const schedule of schedules) for (const e of schedule?.events ?? []) {
    if (Number(e.season?.year) !== year) continue;
    const event = nbaEvent(e);
    if (event) events.set(event.id, event);
  }
  const athletes = Number(roster?.season?.year) === year ? roster.athletes ?? [] : [];
  return { year, warnings, campaign: standings.flatMap((g) => g.rows).find((r) => r.team.espnTeamId === teamId) ?? null,
    averages, events: [...events.values()].sort((a, b) => a.startsAt.localeCompare(b.startsAt)),
    roster: athletes.map((a) => ({ id: a.id, name: a.displayName, jersey: a.jersey ?? '—', position: a.position?.abbreviation ?? '—',
      age: a.age, height: a.displayHeight, photo: a.headshot?.href })) };
}

const gameLabels = { 'fieldGoalsMade-fieldGoalsAttempted': 'Arremessos de quadra', fieldGoalPct: 'Quadra %',
  'threePointFieldGoalsMade-threePointFieldGoalsAttempted': 'Arremessos de 3', threePointFieldGoalPct: '3 pontos %',
  'freeThrowsMade-freeThrowsAttempted': 'Lances livres', freeThrowPct: 'Lances livres %', totalRebounds: 'Rebotes',
  offensiveRebounds: 'Rebotes ofensivos', defensiveRebounds: 'Rebotes defensivos', assists: 'Assistências', steals: 'Roubos',
  blocks: 'Tocos', totalTurnovers: 'Turnovers totais', fouls: 'Faltas', pointsInPaint: 'Pontos no garrafão',
  fastBreakPoints: 'Contra-ataques', largestLead: 'Maior vantagem' };

export function normalizeNbaGame(payload) {
  const competition = payload.header?.competitions?.[0];
  if (!competition) throw new Error('Partida indisponível.');
  const sides = ['home', 'away'].map((side) => competition.competitors?.find((c) => c.homeAway === side));
  if (sides.some((s) => !s?.team)) throw new Error('Equipes da partida indisponíveis.');
  const teams = sides.map((c) => ({ team: nbaTeam(c.team), score: c.score ?? '—',
    periods: (c.linescores ?? []).map((s) => s.displayValue ?? String(s.value ?? '—')) }));
  const teamStats = sides.map((c) => payload.boxscore?.teams?.find((t) => String(t.team.id) === String(c.team.id))?.statistics ?? []);
  return { year: payload.header.season?.year, status: competition.status?.type?.shortDetail ?? '',
    live: competition.status?.type?.state === 'in', teams,
    statistics: Object.entries(gameLabels).flatMap(([key, label]) => {
      const values = teamStats.map((stats) => stats.find((s) => s.name === key)?.displayValue ?? '—');
      return values.every((v) => v === '—') ? [] : [{ key, label, homeValue: values[0], awayValue: values[1] }];
    }),
    players: (payload.boxscore?.players ?? []).map((group) => ({ team: nbaTeam(group.team),
      tables: (group.statistics ?? []).map((s) => ({ labels: s.labels ?? s.names ?? [],
        players: (s.athletes ?? []).map((a) => ({ id: a.athlete.id, name: a.athlete.displayName, starter: !!a.starter,
          didNotPlay: !!a.didNotPlay, stats: a.stats ?? [] })) })) })) };
}

export async function nbaGame(eventId) {
  return normalizeNbaGame(await read(`${SITE}/summary?event=${eventId}`));
}

export function normalizeNbaFinals(payload, year) {
  const rounds = [
    { id: 'east', label: 'Final da Conferência Leste', pattern: /\bEast(?:ern)?\s+(?:Conference\s+)?Finals\b/i },
    { id: 'west', label: 'Final da Conferência Oeste', pattern: /\bWest(?:ern)?\s+(?:Conference\s+)?Finals\b/i },
    { id: 'nba', label: 'Final da NBA', pattern: /\bNBA Finals\b/i },
  ];
  const rawEvents = (payload.events ?? []).filter((event) => Number(event.season?.year) === year
    && Number(event.seasonType?.type ?? event.season?.type) === 3);
  return rounds.map(({ id, label, pattern }) => {
    const games = [...new Map(rawEvents.filter((event) => {
      const competition = event.competitions?.[0];
      const headline = [...(competition?.notes ?? []).map((note) => note.headline ?? ''), competition?.series?.title ?? ''].join(' ');
      return pattern.test(headline);
    }).map(nbaEvent).filter(Boolean).map((event) => [event.id, event])).values()]
      .sort((a, b) => a.startsAt.localeCompare(b.startsAt));
    const teams = [...new Map(games.flatMap((game) => [game.home, game.away]).map((team) => [team.id, team])).values()];
    const results = games.filter((game) => game.status === 'finished' && game.homeScore !== undefined
      && game.awayScore !== undefined && game.homeScore !== game.awayScore);
    const standings = teams.map((team) => ({ team, wins: results.filter((game) =>
      (game.homeScore > game.awayScore ? game.homeTeamId : game.awayTeamId) === team.id).length }));
    const winner = standings.find((side) => side.wins === 4);
    return { id, label, games, teams: standings, champion: teams.length === 2 ? winner?.team ?? null : null };
  });
}

export async function nbaFinals(year) {
  const { date } = await nbaLastGameDate(year);
  if (!date) return normalizeNbaFinals({}, year);
  const day = await read(`${SITE}/scoreboard?dates=${date.replaceAll('-', '')}&limit=100`);
  const rounds = normalizeNbaFinals(day, year);
  const final = rounds.find((round) => round.id === 'nba')?.games.find((game) => game.status === 'finished');
  if (!final) return rounds;
  const schedules = await Promise.all([final.home, final.away].map((team) =>
    read(`${SITE}/teams/${team.espnTeamId}/schedule?season=${year}&seasontype=3`)));
  return normalizeNbaFinals({ events: schedules.flatMap((schedule) => schedule.events ?? []) }, year);
}
