const ESPN_BASE_URL = "https://site.api.espn.com/apis/site/v2/sports";

function getAnnualSeason(date = new Date()) {
  return String(date.getUTCFullYear());
}

function getSplitSeason(date = new Date(), rolloverMonth = 7) {
  const year = date.getUTCFullYear();
  const startYear = date.getUTCMonth() + 1 >= rolloverMonth ? year : year - 1;
  return `${startYear}/${String(startYear + 1).slice(-2)}`;
}

function getLeagueSeason(def, date = new Date()) {
  return def.getSeason ? def.getSeason(date) : getAnnualSeason(date);
}

// ESPN's public scoreboard/teams endpoints require no API key and serve the current season.
// Scope trimmed to the user's focus: NBA, NFL, Brasileirão A-D + Copa do Brasil, and Seleção Brasileira.
const leagueDefs = [
  { id: "brasileirao-a", name: "Brasileirão Série A", country: "Brasil", sport: "football", espnSport: "soccer", espnLeague: "bra.1", getSeason: getAnnualSeason, color: "#16a34a", focusGroup: "futebol" },
  { id: "brasileirao-b", name: "Brasileirão Série B", country: "Brasil", sport: "football", espnSport: "soccer", espnLeague: "bra.2", getSeason: getAnnualSeason, color: "#22c55e", focusGroup: "futebol" },
  { id: "brasileirao-c", name: "Brasileirão Série C", country: "Brasil", sport: "football", espnSport: "soccer", espnLeague: "bra.3", getSeason: getAnnualSeason, color: "#4ade80", focusGroup: "futebol" },
  { id: "brasileirao-d", name: "Brasileirão Série D", country: "Brasil", sport: "football", espnSport: "soccer", espnLeague: "bra.4", getSeason: getAnnualSeason, color: "#86efac", focusGroup: "futebol" },
  { id: "copa-do-brasil", name: "Copa do Brasil", country: "Brasil", sport: "football", espnSport: "soccer", espnLeague: "bra.copa_do_brazil", getSeason: getAnnualSeason, color: "#facc15", supportsPlayers: false, focusGroup: "futebol" },
  { id: "copa-america", name: "Copa América", country: "CONMEBOL", sport: "football", espnSport: "soccer", espnLeague: "conmebol.america", getSeason: getAnnualSeason, color: "#06b6d4", supportsPlayers: false, focusGroup: "selecao" },
  { id: "copa-do-mundo", name: "FIFA World Cup", country: "Internacional", sport: "football", espnSport: "soccer", espnLeague: "fifa.world", getSeason: getAnnualSeason, color: "#2563eb", supportsPlayers: false, focusGroup: "selecao" },
  { id: "amistosos-internacionais", name: "International Friendly", country: "Internacional", sport: "football", espnSport: "soccer", espnLeague: "fifa.friendly", getSeason: getAnnualSeason, color: "#38bdf8", supportsPlayers: false, focusGroup: "selecao" },
  { id: "eliminatorias-conmebol", name: "Eliminatórias CONMEBOL", country: "América do Sul", sport: "football", espnSport: "soccer", espnLeague: "fifa.worldq.conmebol", getSeason: getAnnualSeason, color: "#0891b2", supportsPlayers: false, focusGroup: "selecao" },
  { id: "nba", name: "NBA", country: "Estados Unidos", sport: "basketball", espnSport: "basketball", espnLeague: "nba", getSeason: getSplitSeason, color: "#ea580c", focusGroup: "nba" },
  { id: "nfl", name: "NFL", country: "Estados Unidos", sport: "american_football", espnSport: "football", espnLeague: "nfl", getSeason: getSplitSeason, color: "#7c2d12", focusGroup: "nfl" },
];

const nationalTeamIds = [
  { id: "argentina", name: "Argentina", espnTeamId: "202", federation: "CONMEBOL" },
  { id: "bolivia", name: "Bolívia", espnTeamId: "204", federation: "CONMEBOL" },
  { id: "brazil", name: "Brasil", espnTeamId: "205", federation: "CONMEBOL" },
  { id: "chile", name: "Chile", espnTeamId: "207", federation: "CONMEBOL" },
  { id: "colombia", name: "Colômbia", espnTeamId: "208", federation: "CONMEBOL" },
  { id: "ecuador", name: "Equador", espnTeamId: "209", federation: "CONMEBOL" },
  { id: "paraguay", name: "Paraguai", espnTeamId: "210", federation: "CONMEBOL" },
  { id: "peru", name: "Peru", espnTeamId: "211", federation: "CONMEBOL" },
  { id: "uruguay", name: "Uruguai", espnTeamId: "212", federation: "CONMEBOL" },
  { id: "venezuela", name: "Venezuela", espnTeamId: "213", federation: "CONMEBOL" },
  { id: "canada", name: "Canadá", espnTeamId: "206", federation: "CONCACAF" },
  { id: "mexico", name: "México", espnTeamId: "203", federation: "CONCACAF" },
  { id: "usa", name: "Estados Unidos", espnTeamId: "660", federation: "CONCACAF" },
  { id: "france", name: "França", espnTeamId: "478", federation: "UEFA" },
  { id: "germany", name: "Alemanha", espnTeamId: "481", federation: "UEFA" },
  { id: "italy", name: "Itália", espnTeamId: "162", federation: "UEFA" },
  { id: "portugal", name: "Portugal", espnTeamId: "482", federation: "UEFA" },
  { id: "spain", name: "Espanha", espnTeamId: "164", federation: "UEFA" },
];




async function espnFetch(path) {
  const response = await fetch(`${ESPN_BASE_URL}${path}`, {
    headers: { Accept: "application/json" },
    credentials: "omit",
    signal: AbortSignal.timeout(8000),
  });

  if (!response.ok) {
    throw new Error(`ESPN request failed: ${response.status} ${path}`);
  }

  return response.json();
}

function normalizeTeam(teamItem, leagueId) {
  const team = teamItem.team ?? teamItem;
  if (!team?.id || !team?.displayName) return null;

  return {
    id: `${leagueId}-${team.id}`,
    espnTeamId: String(team.id),
    name: team.displayName,
    shortName: team.abbreviation || team.displayName.slice(0, 3).toUpperCase(),
    leagueId,
    city: team.location || "N/D",
    color: team.color ? `#${team.color}` : "#2563eb",
    logoUrl: team.logos?.find((logo) => logo.href?.startsWith("https://"))?.href
      ?? (team.logo?.startsWith("https://") ? team.logo : undefined),
  };
}

function mapStatus(state) {
  if (state === "post") return "finished";
  if (state === "in") return "live";
  return "scheduled";
}

function getStat(categories, categoryName, statName) {
  const category = categories?.find((item) => item.name === categoryName);
  const stat = category?.stats?.find((item) => item.name === statName);
  return stat?.value ?? 0;
}

function normalizePlayer(athlete, teamId, leagueId) {
  if (!athlete?.id || !athlete?.displayName) return null;

  const categories = athlete.statistics?.splits?.categories;

  return {
    id: `${leagueId}-${athlete.id}`,
    teamId,
    name: athlete.displayName,
    position: athlete.position?.displayName || "N/D",
    age: athlete.age ?? 0,
    nationality: athlete.citizenship || "N/D",
    appearances: getStat(categories, "general", "appearances"),
    goals: getStat(categories, "offensive", "totalGoals"),
    assists: getStat(categories, "offensive", "goalAssists"),
    shotsOnTarget: getStat(categories, "offensive", "shotsOnTarget"),
    foulsCommitted: getStat(categories, "general", "foulsCommitted"),
    yellowCards: getStat(categories, "general", "yellowCards"),
  };
}

function percentileRank(values, value) {
  if (!values.length) return 0;
  const below = values.filter((item) => item <= value).length;
  return Math.round((below / values.length) * 100);
}

async function loadFootballPlayers(def, teams) {
  const season = getLeagueSeason(def);
  const rosterResults = await Promise.allSettled(
    teams.map((team) =>
      espnFetch(`/${def.espnSport}/${def.espnLeague}/teams/${team.id.replace(`${def.id}-`, "")}/roster`).then(
        (payload) => (payload.athletes ?? []).map((athlete) => normalizePlayer(athlete, team.id, def.id)).filter(Boolean),
      ),
    ),
  );

  const rawPlayers = rosterResults
    .filter((result) => result.status === "fulfilled")
    .flatMap((result) => result.value)
    .filter((player) => player.appearances > 0);

  const goalsPool = rawPlayers.map((player) => player.goals);
  const assistsPool = rawPlayers.map((player) => player.assists);
  const shotsPool = rawPlayers.map((player) => player.shotsOnTarget);
  const appearancesPool = rawPlayers.map((player) => player.appearances);

  const topPlayersByTeam = new Map();
  rawPlayers
    .sort((a, b) => b.goals * 2 + b.assists - (a.goals * 2 + a.assists))
    .forEach((player) => {
      const bucket = topPlayersByTeam.get(player.teamId) ?? [];
      if (bucket.length < 3) {
        bucket.push(player);
        topPlayersByTeam.set(player.teamId, bucket);
      }
    });

  return [...topPlayersByTeam.values()].flat().map((player) => ({
    id: player.id,
    name: player.name,
    teamId: player.teamId,
    position: player.position,
    age: player.age,
    nationality: player.nationality,
    marketValueEUR: 0,
    titles: [],
    seasons: [
      {
        season,
        sport: "football",
        competitionId: def.id,
        appearances: player.appearances,
        goals: player.goals,
        assists: player.assists,
        shotsOnTarget: player.shotsOnTarget,
        foulsCommitted: player.foulsCommitted,
        yellowCards: player.yellowCards,
        recentRatings: [],
        percentiles: {
          goals: percentileRank(goalsPool, player.goals),
          assists: percentileRank(assistsPool, player.assists),
          shotsOnTarget: percentileRank(shotsPool, player.shotsOnTarget),
          appearances: percentileRank(appearancesPool, player.appearances),
        },
      },
    ],
  }));
}

function normalizeEvent(event, leagueId) {
  const competition = event.competitions?.[0];
  const competitors = competition?.competitors;
  if (!competition || !competitors || competitors.length < 2) return null;

  const home = competitors.find((item) => item.homeAway === "home");
  const away = competitors.find((item) => item.homeAway === "away");
  if (!home?.team?.id || !away?.team?.id) return null;

  const status = mapStatus(competition.status?.type?.state);

  return {
    id: `${leagueId}-${event.id}`,
    leagueId,
    homeTeamId: `${leagueId}-${home.team.id}`,
    awayTeamId: `${leagueId}-${away.team.id}`,
    startsAt: event.date,
    status,
    venue: competition.venue?.fullName || "A definir",
    ...(status !== "scheduled" ? { homeScore: Number(home.score ?? 0), awayScore: Number(away.score ?? 0) } : {}),
  };
}

function getLeagueDefinition(leagueId) {
  return leagueDefs.find((def) => def.id === leagueId) ?? null;
}

function stripLeaguePrefix(value, leagueId) {
  if (typeof value !== "string") return "";
  return value.startsWith(`${leagueId}-`) ? value.slice(leagueId.length + 1) : value;
}

function normalizeKey(value) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/gi, "")
    .toLowerCase();
}

function getDisplayValue(stat) {
  if (stat?.displayValue != null) return String(stat.displayValue);
  if (stat?.value != null) return String(stat.value);
  if (stat?.display != null) return String(stat.display);
  return "";
}

function collectStatEntries(items, bucket = []) {
  if (!Array.isArray(items)) return bucket;

  items.forEach((item) => {
    if (!item || typeof item !== "object") return;

    if (item.name || item.displayName || item.label) {
      const value = getDisplayValue(item);

      if (value) {
        bucket.push({
          key: normalizeKey(item.name || item.displayName || item.label),
          label: item.displayName || item.label || item.name,
          value,
        });
      }
    }

    collectStatEntries(item.stats, bucket);
    collectStatEntries(item.statistics, bucket);
  });

  return bucket;
}

function findStatValue(entries, aliases) {
  const normalizedAliases = aliases.map(normalizeKey);
  const match = entries.find((entry) => normalizedAliases.includes(entry.key));
  return match?.value ?? "";
}

function buildEventSummaryStats(def, competition, homeStats, awayStats) {
  const scoreFallback = (side) => String(side === "home" ? Number(competition?.competitors?.find((item) => item.homeAway === "home")?.score ?? 0) : Number(competition?.competitors?.find((item) => item.homeAway === "away")?.score ?? 0));
  const configs = {
    football: [
      { key: "goals", label: "Gols", aliases: ["goals", "totalGoals", "score"], fallback: scoreFallback },
      { key: "shots", label: "Chutes", aliases: ["shots", "totalShots", "shotsTotal"] },
      { key: "shots-on-target", label: "Chutes no gol", aliases: ["shotsOnTarget", "shotsOnGoal", "ontargetscoringattempts"] },
      { key: "possession", label: "Posse de bola", aliases: ["possessionPct", "possessionPercentage", "possession"] },
      { key: "passes", label: "Passes certos", aliases: ["accuratePasses", "successfulPasses", "passesAccurate", "completedPasses"] },
      { key: "yellow-cards", label: "Cartões amarelos", aliases: ["yellowCards"] },
      { key: "red-cards", label: "Cartões vermelhos", aliases: ["redCards"] },
    ],
    basketball: [
      { key: "points", label: "Pontos", aliases: ["points", "score"], fallback: scoreFallback },
      { key: "field-goal-pct", label: "FG%", aliases: ["fieldGoalPct", "fieldGoalsPercentage", "fieldgoalpct"] },
      { key: "three-point-pct", label: "3PT%", aliases: ["threePointFieldGoalPct", "threePointPct", "threePointPercentage"] },
      { key: "free-throw-pct", label: "LL%", aliases: ["freeThrowPct", "freeThrowsPercentage", "freethrowpct"] },
      { key: "rebounds", label: "Rebotes", aliases: ["rebounds", "totalRebounds"] },
      { key: "assists", label: "Assistências", aliases: ["assists"] },
      { key: "paint", label: "Pontos no garrafão", aliases: ["pointsInPaint", "paintPoints"] },
      { key: "turnovers", label: "Turnovers", aliases: ["turnovers"] },
    ],
    american_football: [
      { key: "touchdowns", label: "Touchdowns", aliases: ["touchdowns", "totalTouchdowns"] },
      { key: "passing-yards", label: "Jardas aéreas", aliases: ["passingYards", "netPassingYards"] },
      { key: "rushing-yards", label: "Jardas terrestres", aliases: ["rushingYards"] },
      { key: "total-yards", label: "Jardas totais", aliases: ["totalYards"] },
      { key: "turnovers", label: "Turnovers", aliases: ["turnovers", "turnoversLost"] },
      { key: "field-goals", label: "Field goals", aliases: ["fieldGoals", "fieldGoalsMade"] },
      { key: "sacks", label: "Sacks", aliases: ["sacks"] },
      { key: "third-down", label: "3rd down", aliases: ["thirdDownEff", "thirdDownConversions", "thirddownefficiency"] },
    ],
  }[def.sport] ?? [];

  return configs
    .map((config) => {
      const homeValue = findStatValue(homeStats, config.aliases) || (config.fallback ? config.fallback("home") : "");
      const awayValue = findStatValue(awayStats, config.aliases) || (config.fallback ? config.fallback("away") : "");

      if (!homeValue && !awayValue) return null;

      return {
        key: config.key,
        label: config.label,
        homeValue,
        awayValue,
      };
    })
    .filter(Boolean);
}

function collectLeaderEntries(leaders = []) {
  return leaders
    .map((leader) => {
      const item = leader?.leaders?.[0];
      const athlete = item?.athlete;
      const fragments = [athlete?.displayName || athlete?.shortName, item?.displayValue || item?.displayValueShort]
        .filter(Boolean);
      const value = fragments.join(" · ") || leader?.displayValue || "";

      if (!value) return null;

      return {
        key: normalizeKey(leader?.name || leader?.displayName || leader?.shortDisplayName),
        label: leader?.displayName || leader?.shortDisplayName || leader?.name || "Destaque",
        value,
      };
    })
    .filter(Boolean);
}

function findLeaderValue(entries, aliases) {
  const normalizedAliases = aliases.map(normalizeKey);
  const match = entries.find((entry) => normalizedAliases.includes(entry.key));
  return match?.value ?? "";
}

function buildEventSummaryLeaders(def, competitors) {
  const homeCompetitor = competitors.find((item) => item.homeAway === "home");
  const awayCompetitor = competitors.find((item) => item.homeAway === "away");
  const homeLeaders = collectLeaderEntries(homeCompetitor?.leaders);
  const awayLeaders = collectLeaderEntries(awayCompetitor?.leaders);
  const configs = {
    football: [
      { key: "scoring", label: "Artilheiro", aliases: ["goals", "scoring", "goalsscored"] },
      { key: "assists", label: "Assistências", aliases: ["assists", "goalassists"] },
      { key: "shots", label: "Finalizações", aliases: ["shots", "shotsontarget"] },
    ],
    basketball: [
      { key: "points", label: "Pontuador", aliases: ["points", "scoring"] },
      { key: "rebounds", label: "Rebotes", aliases: ["rebounds"] },
      { key: "assists", label: "Assistências", aliases: ["assists"] },
      { key: "three-point", label: "Perímetro", aliases: ["threePointFieldGoalsMade", "threepointsmade", "3pt"] },
    ],
    american_football: [
      { key: "touchdowns", label: "Touchdowns", aliases: ["touchdowns", "totaltouchdowns"] },
      { key: "passing", label: "Jogo aéreo", aliases: ["passing", "passingyards"] },
      { key: "rushing", label: "Jogo terrestre", aliases: ["rushing", "rushingyards"] },
      { key: "receiving", label: "Recepções", aliases: ["receiving", "receivingyards"] },
    ],
  }[def.sport] ?? [];

  return configs
    .map((config) => {
      const homeValue = findLeaderValue(homeLeaders, config.aliases);
      const awayValue = findLeaderValue(awayLeaders, config.aliases);

      if (!homeValue && !awayValue) return null;

      return {
        key: config.key,
        label: config.label,
        homeValue,
        awayValue,
      };
    })
    .filter(Boolean);
}

export async function loadEventSummary(leagueId, eventId) {
  const def = getLeagueDefinition(leagueId);
  if (!def) return null;

  const rawEventId = stripLeaguePrefix(eventId, leagueId);
  if (!rawEventId) return null;

  const payload = await espnFetch(`/${def.espnSport}/${def.espnLeague}/summary?event=${rawEventId}`);
  const competition = payload.header?.competitions?.[0];
  const competitors = competition?.competitors ?? [];
  const boxscoreTeams = payload.boxscore?.teams ?? [];
  const homeCompetitor = competitors.find((item) => item.homeAway === "home");
  const awayCompetitor = competitors.find((item) => item.homeAway === "away");
  const homeStats = collectStatEntries(
    boxscoreTeams.find((item) => String(item?.team?.id ?? "") === String(homeCompetitor?.id ?? ""))?.statistics,
  );
  const awayStats = collectStatEntries(
    boxscoreTeams.find((item) => String(item?.team?.id ?? "") === String(awayCompetitor?.id ?? ""))?.statistics,
  );
  const statistics = buildEventSummaryStats(def, competition, homeStats, awayStats);
  const leaders = buildEventSummaryLeaders(def, competitors);

  return {
    eventId,
    sport: def.sport,
    shortStatus: competition?.status?.type?.shortDetail || competition?.status?.type?.description || "",
    note: payload.news?.[0]?.headline || competition?.status?.type?.detail || "",
    statistics,
    leaders,
  };
}

async function loadLeagueData(def) {
  // ESPN's scoreboard endpoint rejects the "dates=FROM-TO" range format (400); the
  // no-param default already returns the current round/week window we need.
  const [teamsResult, scoreboardResult] = await Promise.allSettled([
    // The catalog does not expose CORS; browser fallback derives teams from scoreboards.
    typeof window === "undefined"
      ? espnFetch(`/${def.espnSport}/${def.espnLeague}/teams`)
      : Promise.resolve(null),
    espnFetch(`/${def.espnSport}/${def.espnLeague}/scoreboard`),
  ]);

  if (teamsResult.status === "rejected" && scoreboardResult.status === "rejected") {
    throw new AggregateError([teamsResult.reason, scoreboardResult.reason], `ESPN unavailable: ${def.id}`);
  }
  const teamsPayload = teamsResult.status === "fulfilled" ? teamsResult.value : null;
  const scoreboardPayload = scoreboardResult.status === "fulfilled" ? scoreboardResult.value : null;
  const rawEvents = scoreboardPayload?.events ?? [];
  const teamGroups = teamsPayload?.sports?.[0]?.leagues?.[0]?.teams ?? [];
  const teamsById = new Map();
  const scoreboardTeams = rawEvents.flatMap((event) =>
    event.competitions?.[0]?.competitors?.map((competitor) => competitor.team) ?? [],
  );
  [...teamGroups, ...scoreboardTeams].forEach((item) => {
    if (!item) return;
    const team = normalizeTeam(item, def.id);
    if (team) teamsById.set(team.id, team);
  });
  const teams = [...teamsById.values()];

  const events = rawEvents
    .map((event) => normalizeEvent(event, def.id))
    .filter((event) => event && teamsById.has(event.homeTeamId) && teamsById.has(event.awayTeamId));

  const players = def.espnSport === "soccer" && def.supportsPlayers !== false
    ? await loadFootballPlayers(def, teams)
    : [];

  return { teams, events, players };
}

export async function loadSportsData() {
  const results = await Promise.allSettled(leagueDefs.map((def) => loadLeagueData(def)));

  results.forEach((result, index) => {
    if (result.status === "rejected") {
      console.error(`sports-vault: failed to load ${leagueDefs[index].id}`, result.reason);
    }
  });

  const leagues = leagueDefs.map((def) => ({
    id: def.id,
    name: def.name,
    country: def.country,
    sport: def.sport,
    season: getLeagueSeason(def),
    color: def.color,
    focusGroup: def.focusGroup,
  }));

  const teamsById = new Map();
  const events = [];
  const players = [];

  results
    .filter((result) => result.status === "fulfilled")
    .map((result) => result.value)
    .forEach(({ teams, events: leagueEvents, players: leaguePlayers }) => {
      teams.forEach((team) => teamsById.set(team.id, team));
      events.push(...leagueEvents);
      players.push(...leaguePlayers);
    });

  events.sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime());

  if (!teamsById.size) {
    throw new Error("Não foi possível obter dados da ESPN. Tente novamente em instantes.");
  }

  return { leagues, nationalTeams: nationalTeamIds, teams: [...teamsById.values()], events: events.slice(0, 160), players };
}
