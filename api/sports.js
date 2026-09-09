const FOOTBALL_BASE_URL = "https://v3.football.api-sports.io";
const NBA_BASE_URL = "https://v2.nba.api-sports.io";
const CACHE_TTL_MS = 10 * 60 * 1000;

const footballLeagues = [
  {
    apiId: 39,
    id: "football-39",
    name: "Premier League",
    country: "Inglaterra",
    color: "#5b21b6",
  },
  {
    apiId: 140,
    id: "football-140",
    name: "LaLiga",
    country: "Espanha",
    color: "#ef4444",
  },
  {
    apiId: 2,
    id: "football-2",
    name: "UEFA Champions League",
    country: "Europa",
    color: "#1d4ed8",
  },
];

const nbaLeague = {
  id: "nba",
  name: "NBA",
  country: "Estados Unidos",
  sport: "basketball",
  season: process.env.SPORTS_API_NBA_SEASON ?? "2024",
  color: "#ea580c",
};

let cachedPayload;
let cachedAt = 0;

// API-SPORTS Free plan only serves seasons 2022-2024.
function getCurrentFootballSeason() {
  return "2024";
}

function formatDate(date) {
  return date.toISOString().slice(0, 10);
}

function addDays(date, days) {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

function slugify(value) {
  return String(value)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function colorFromId(value) {
  const palette = [
    "#2563eb",
    "#dc2626",
    "#15803d",
    "#7c3aed",
    "#0f766e",
    "#be123c",
    "#ca8a04",
    "#0369a1",
  ];
  const index = [...String(value)].reduce((sum, char) => sum + char.charCodeAt(0), 0) % palette.length;
  return palette[index];
}

async function apiSportsFetch(baseUrl, path, apiKey) {
  const response = await fetch(`${baseUrl}${path}`, {
    headers: {
      "x-apisports-key": apiKey,
    },
  });

  if (!response.ok) {
    throw new Error(`API-SPORTS request failed: ${response.status}`);
  }

  const payload = await response.json();
  if (payload.errors && Object.keys(payload.errors).length > 0) {
    throw new Error("API-SPORTS returned an error payload");
  }

  return Array.isArray(payload.response) ? payload.response : [];
}

function normalizeFootballTeam(item, leagueId) {
  const team = item.team;
  if (!team?.id || !team?.name) return null;

  return {
    id: `football-${team.id}`,
    name: team.name,
    shortName: team.code || team.name.slice(0, 3).toUpperCase(),
    leagueId,
    city: item.venue?.city || item.team?.country || "N/D",
    color: colorFromId(team.id),
  };
}

function normalizeNbaTeam(item) {
  if (!item?.id || !item?.name || item.allStar || item.nbaFranchise === false) return null;

  return {
    id: `nba-${item.id}`,
    name: item.name,
    shortName: item.code || item.nickname || item.name.slice(0, 3).toUpperCase(),
    leagueId: nbaLeague.id,
    city: item.city || "N/D",
    color: colorFromId(item.id),
  };
}

function normalizeFootballEvent(item) {
  const fixture = item.fixture;
  const league = item.league;
  const teams = item.teams;
  if (!fixture?.id || !fixture?.date || !league?.id || !teams?.home?.id || !teams?.away?.id) return null;

  const status = fixture.status?.short === "FT" ? "finished" : "scheduled";
  const goals = item.goals ?? {};

  return {
    id: `football-${fixture.id}`,
    leagueId: `football-${league.id}`,
    homeTeamId: `football-${teams.home.id}`,
    awayTeamId: `football-${teams.away.id}`,
    startsAt: fixture.date,
    status,
    venue: fixture.venue?.name || "A definir",
    ...(status === "finished" ? { homeScore: goals.home ?? 0, awayScore: goals.away ?? 0 } : {}),
  };
}

function normalizeNbaEvent(item) {
  if (!item?.id || !item?.date?.start || !item?.teams?.home?.id || !item?.teams?.visitors?.id) return null;

  const isFinished = item.status?.short === 3 || String(item.status?.long).toLowerCase().includes("finished");

  return {
    id: `nba-${item.id}`,
    leagueId: nbaLeague.id,
    homeTeamId: `nba-${item.teams.home.id}`,
    awayTeamId: `nba-${item.teams.visitors.id}`,
    startsAt: item.date.start,
    status: isFinished ? "finished" : "scheduled",
    venue: item.arena?.name || "A definir",
    ...(isFinished
      ? { homeScore: item.scores?.home?.points ?? 0, awayScore: item.scores?.visitors?.points ?? 0 }
      : {}),
  };
}

async function loadSportsData(apiKey) {
  const footballSeason = process.env.SPORTS_API_FOOTBALL_SEASON ?? getCurrentFootballSeason();
  const today = new Date();
  const from = formatDate(addDays(today, -7));
  const to = formatDate(addDays(today, 21));

  const leagues = [
    ...footballLeagues.map((league) => ({
      id: league.id,
      name: league.name,
      country: league.country,
      sport: "football",
      season: footballSeason,
      color: league.color,
    })),
    nbaLeague,
  ];

  const footballTeamRequests = footballLeagues.map((league) =>
    apiSportsFetch(FOOTBALL_BASE_URL, `/teams?league=${league.apiId}&season=${footballSeason}`, apiKey).then((items) =>
      items.map((item) => normalizeFootballTeam(item, league.id)).filter(Boolean),
    ),
  );

  const footballFixtureRequests = footballLeagues.map((league) =>
    apiSportsFetch(
      FOOTBALL_BASE_URL,
      `/fixtures?league=${league.apiId}&season=${footballSeason}&from=${from}&to=${to}`,
      apiKey,
    ).then((items) => items.map(normalizeFootballEvent).filter(Boolean)),
  );

  const [footballTeams, footballEvents, nbaTeams, nbaGames] = await Promise.all([
    Promise.all(footballTeamRequests).then((groups) => groups.flat()),
    Promise.all(footballFixtureRequests).then((groups) => groups.flat()),
    apiSportsFetch(NBA_BASE_URL, "/teams", apiKey).then((items) => items.map(normalizeNbaTeam).filter(Boolean)),
    apiSportsFetch(NBA_BASE_URL, `/games?season=${nbaLeague.season}`, apiKey).then((items) =>
      items.map(normalizeNbaEvent).filter(Boolean),
    ),
  ]);

  const eventTeamIds = new Set([...footballEvents, ...nbaGames].flatMap((event) => [event.homeTeamId, event.awayTeamId]));
  const teamsById = new Map([...footballTeams, ...nbaTeams].map((team) => [team.id, team]));
  const teams = [...teamsById.values()].filter((team) => eventTeamIds.has(team.id)).slice(0, 80);
  const events = [...footballEvents, ...nbaGames]
    .filter((event) => teamsById.has(event.homeTeamId) && teamsById.has(event.awayTeamId))
    .sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime())
    .slice(0, 40);

  return { leagues, teams, events };
}

module.exports = async function handler(request, response) {
  if (request.method !== "GET") {
    response.setHeader("Allow", "GET");
    response.status(405).json({ error: "Method not allowed" });
    return;
  }

  const apiKey = process.env.SPORTS_API_KEY;
  if (!apiKey) {
    response.status(503).json({ error: "SPORTS_API_KEY is not configured" });
    return;
  }

  try {
    if (cachedPayload && Date.now() - cachedAt < CACHE_TTL_MS) {
      response.status(200).json(cachedPayload);
      return;
    }

    cachedPayload = await loadSportsData(apiKey);
    cachedAt = Date.now();
    response.status(200).json(cachedPayload);
  } catch (error) {
    response.status(502).json({
      error: error instanceof Error ? error.message : "Could not load sports data",
    });
  }
};
