import type { FootballSeasonSchedule, FootballStanding, League, Player, SportEvent, SportEventSummary, Team } from "../types/sports";
import type { SportsProvider } from "./SportsProvider";

interface SportsApiPayload {
  leagues?: League[];
  teams?: Team[];
  events?: SportEvent[];
  players?: Player[];
}

const sportsApiBaseUrl = import.meta.env.VITE_SPORTS_API_BASE_URL || "/api/sports";

function isFootballStanding(value: unknown): value is FootballStanding {
  return typeof value === "object" && value !== null
    && "teamId" in value && typeof value.teamId === "string"
    && "teamName" in value && typeof value.teamName === "string"
    && "position" in value && typeof value.position === "number" && Number.isFinite(value.position)
    && "points" in value && typeof value.points === "number" && Number.isFinite(value.points)
    && "played" in value && typeof value.played === "number" && Number.isFinite(value.played)
    && "wins" in value && typeof value.wins === "number" && Number.isFinite(value.wins)
    && "draws" in value && typeof value.draws === "number" && Number.isFinite(value.draws)
    && "losses" in value && typeof value.losses === "number" && Number.isFinite(value.losses)
    && "goalsFor" in value && typeof value.goalsFor === "number" && Number.isFinite(value.goalsFor)
    && "goalsAgainst" in value && typeof value.goalsAgainst === "number" && Number.isFinite(value.goalsAgainst);
}

function isFootballSeasonSchedule(value: unknown): value is FootballSeasonSchedule {
  return typeof value === "object" && value !== null
    && "events" in value && Array.isArray(value.events)
    && "teams" in value && Array.isArray(value.teams)
    && value.events.every((event) => typeof event === "object" && event !== null
      && "id" in event && typeof event.id === "string"
      && "leagueId" in event && typeof event.leagueId === "string"
      && "homeTeamId" in event && typeof event.homeTeamId === "string"
      && "awayTeamId" in event && typeof event.awayTeamId === "string"
      && "startsAt" in event && typeof event.startsAt === "string"
      && "status" in event && ["scheduled", "live", "finished"].includes(String(event.status)))
    && value.teams.every((team) => typeof team === "object" && team !== null
      && "id" in team && typeof team.id === "string"
      && "name" in team && typeof team.name === "string"
      && "leagueId" in team && typeof team.leagueId === "string");
}

async function loadSportsData(): Promise<Required<SportsApiPayload>> {
  try {
    const response = await fetch(sportsApiBaseUrl, { signal: AbortSignal.timeout(20000) });

    if (!response.ok) {
      throw new Error("Não foi possível carregar os dados esportivos.");
    }

    const payload = (await response.json()) as SportsApiPayload | null;
    if (!payload || !Array.isArray(payload.leagues) || !payload.leagues.length
      || !Array.isArray(payload.teams) || !payload.teams.length
      || !Array.isArray(payload.events) || !Array.isArray(payload.players)) {
      throw new Error("A API esportiva retornou dados indisponíveis.");
    }

    return { leagues: payload.leagues, teams: payload.teams, events: payload.events, players: payload.players };
  } catch {
    const espn = await import("../../../shared/espn.mjs");
    return espn.loadSportsData();
  }
}

let sportsDataPromise: Promise<Required<SportsApiPayload>> | null = null;
const summaryCache = new Map<string, Promise<SportEventSummary | null>>();
const standingsCache = new Map<string, Promise<FootballStanding[]>>();
const footballScheduleCache = new Map<string, Promise<FootballSeasonSchedule>>();

function getSportsData() {
  sportsDataPromise ??= loadSportsData().catch((error: unknown) => {
    sportsDataPromise = null;
    throw error;
  });
  return sportsDataPromise;
}

export const apiSportsProvider: SportsProvider = {
  async getLeagues() {
    return (await getSportsData()).leagues;
  },
  async getTeams() {
    return (await getSportsData()).teams;
  },
  async getEvents() {
    return (await getSportsData()).events;
  },
  async getPlayers() {
    return (await getSportsData()).players;
  },
  async getEventSummary(event) {
    const cacheKey = event.id;

    if (!summaryCache.has(cacheKey)) {
      summaryCache.set(
        cacheKey,
        fetch(
          `${sportsApiBaseUrl}?type=summary&eventId=${encodeURIComponent(event.id)}&leagueId=${encodeURIComponent(event.leagueId)}`,
          { signal: AbortSignal.timeout(20000) },
        )
          .then(async (response) => {
            if (response.status === 404) return null;
            if (!response.ok) {
              throw new Error("Não foi possível carregar o resumo da partida.");
            }

            return (await response.json()) as SportEventSummary;
          })
          .catch(async () => {
            const espn = await import("../../../shared/espn.mjs");
            return espn.loadEventSummary(event.leagueId, event.id);
          })
          .catch((error: unknown) => {
            summaryCache.delete(cacheKey);
            throw error;
          }),
      );
    }

    return summaryCache.get(cacheKey)!;
  },
  async getLeagueStandings(leagueId) {
    if (!standingsCache.has(leagueId)) {
      standingsCache.set(
        leagueId,
        fetch(`${sportsApiBaseUrl}?type=football-standings&leagueId=${encodeURIComponent(leagueId)}`, {
          signal: AbortSignal.timeout(20000),
        })
          .then(async (response) => {
            if (!response.ok) {
              throw new Error("Não foi possível carregar a classificação da competição.");
            }

            const payload: unknown = await response.json();
            if (!Array.isArray(payload) || !payload.every(isFootballStanding)) {
              throw new Error("A API esportiva retornou uma classificação inválida.");
            }
            return payload;
          })
          .catch(async () => {
            const espn = await import("../../../shared/espn.mjs");
            return espn.loadFootballStandings(leagueId);
          })
          .catch((error: unknown) => {
            standingsCache.delete(leagueId);
            throw error;
          }),
      );
    }

    return standingsCache.get(leagueId)!;
  },
  async getFootballSeasonSchedule(leagueId) {
    if (!footballScheduleCache.has(leagueId)) {
      footballScheduleCache.set(
        leagueId,
        fetch(`${sportsApiBaseUrl}?type=football-rounds&leagueId=${encodeURIComponent(leagueId)}`, {
          signal: AbortSignal.timeout(20000),
        })
          .then(async (response) => {
            if (!response.ok) {
              throw new Error("Não foi possível carregar as rodadas da competição.");
            }
            const payload: unknown = await response.json();
            if (!isFootballSeasonSchedule(payload)) {
              throw new Error("A API esportiva retornou rodadas inválidas.");
            }
            return payload;
          })
          .catch(async () => {
            const espn = await import("../../../shared/espn.mjs");
            return espn.loadFootballSeasonSchedule(leagueId);
          })
          .catch((error: unknown) => {
            footballScheduleCache.delete(leagueId);
            throw error;
          }),
      );
    }
    return footballScheduleCache.get(leagueId)!;
  },
};
