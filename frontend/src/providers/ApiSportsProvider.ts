import type { League, Player, SportEvent, SportEventSummary, Team } from "../types/sports";
import type { SportsProvider } from "./SportsProvider";

interface SportsApiPayload {
  leagues?: League[];
  teams?: Team[];
  events?: SportEvent[];
  players?: Player[];
}

const sportsApiBaseUrl = import.meta.env.VITE_SPORTS_API_BASE_URL || "/api/sports";

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
};
