const ESPN_BASE_URL = "https://site.api.espn.com/apis/site/v2/sports";
const CACHE_TTL_MS = 10 * 60 * 1000;

// ESPN's public scoreboard/teams endpoints require no API key and serve the current season.
const leagueDefs = [
  { id: "premier-league", name: "Premier League", country: "Inglaterra", sport: "football", espnSport: "soccer", espnLeague: "eng.1", season: "2026/27", color: "#5b21b6" },
  { id: "la-liga", name: "LaLiga", country: "Espanha", sport: "football", espnSport: "soccer", espnLeague: "esp.1", season: "2026/27", color: "#ef4444" },
  { id: "champions-league", name: "UEFA Champions League", country: "Europa", sport: "football", espnSport: "soccer", espnLeague: "uefa.champions", season: "2026/27", color: "#1d4ed8" },
  { id: "nba", name: "NBA", country: "Estados Unidos", sport: "basketball", espnSport: "basketball", espnLeague: "nba", season: "2026/27", color: "#ea580c" },
  { id: "nfl", name: "NFL", country: "Estados Unidos", sport: "american_football", espnSport: "football", espnLeague: "nfl", season: "2026/27", color: "#7c2d12" },
];

let cachedPayload;
let cachedAt = 0;

function formatDate(date) {
  return date.toISOString().slice(0, 10).replace(/-/g, "");
}

function addDays(date, days) {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

async function espnFetch(path) {
  const response = await fetch(`${ESPN_BASE_URL}${path}`);

  if (!response.ok) {
    throw new Error(`ESPN request failed: ${response.status}`);
  }

  return response.json();
}

function normalizeTeam(teamItem, leagueId) {
  const team = teamItem.team ?? teamItem;
  if (!team?.id || !team?.displayName) return null;

  return {
    id: `${leagueId}-${team.id}`,
    name: team.displayName,
    shortName: team.abbreviation || team.displayName.slice(0, 3).toUpperCase(),
    leagueId,
    city: team.location || "N/D",
    color: team.color ? `#${team.color}` : "#2563eb",
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
        season: def.season,
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

async function loadLeagueData(def) {
  const today = new Date();
  const from = formatDate(addDays(today, -3));
  const to = formatDate(addDays(today, 10));

  const [teamsPayload, scoreboardPayload] = await Promise.all([
    espnFetch(`/${def.espnSport}/${def.espnLeague}/teams`),
    espnFetch(`/${def.espnSport}/${def.espnLeague}/scoreboard?dates=${from}-${to}`),
  ]);

  const teamGroups = teamsPayload.sports?.[0]?.leagues?.[0]?.teams ?? [];
  const teams = teamGroups.map((item) => normalizeTeam(item, def.id)).filter(Boolean);

  const events = (scoreboardPayload.events ?? [])
    .map((event) => normalizeEvent(event, def.id))
    .filter(Boolean);

  const players = def.espnSport === "soccer" ? await loadFootballPlayers(def, teams) : [];

  return { teams, events, players };
}

async function loadSportsData() {
  const results = await Promise.all(leagueDefs.map((def) => loadLeagueData(def)));

  const leagues = leagueDefs.map(({ id, name, country, sport, season, color }) => ({
    id,
    name,
    country,
    sport,
    season,
    color,
  }));

  const teamsById = new Map();
  const events = [];
  const players = [];

  results.forEach(({ teams, events: leagueEvents, players: leaguePlayers }) => {
    teams.forEach((team) => teamsById.set(team.id, team));
    events.push(...leagueEvents);
    players.push(...leaguePlayers);
  });

  events.sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime());

  return { leagues, teams: [...teamsById.values()], events: events.slice(0, 60), players };
}

module.exports = async function handler(request, response) {
  if (request.method !== "GET") {
    response.setHeader("Allow", "GET");
    response.status(405).json({ error: "Method not allowed" });
    return;
  }

  try {
    if (cachedPayload && Date.now() - cachedAt < CACHE_TTL_MS) {
      response.status(200).json(cachedPayload);
      return;
    }

    cachedPayload = await loadSportsData();
    cachedAt = Date.now();
    response.status(200).json(cachedPayload);
  } catch (error) {
    response.status(502).json({
      error: error instanceof Error ? error.message : "Could not load sports data",
    });
  }
};
