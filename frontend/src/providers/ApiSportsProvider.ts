import type { League, Player, SportEvent, Team } from "../types/sports";
import type { SportsProvider } from "./SportsProvider";

interface SportsApiPayload {
  leagues?: League[];
  teams?: Team[];
  events?: SportEvent[];
  players?: Player[];
}

const sportsApiBaseUrl = import.meta.env.VITE_SPORTS_API_BASE_URL || "/api/sports";

async function loadSportsData(): Promise<Required<SportsApiPayload>> {
  const response = await fetch(sportsApiBaseUrl);

  if (!response.ok) {
    throw new Error("Não foi possível carregar os dados esportivos.");
  }

  const payload = (await response.json()) as SportsApiPayload;

  return {
    leagues: Array.isArray(payload.leagues) ? payload.leagues : [],
    teams: Array.isArray(payload.teams) ? payload.teams : [],
    events: Array.isArray(payload.events) ? payload.events : [],
    players: Array.isArray(payload.players) ? payload.players : [],
  };
}

let sportsDataPromise: Promise<Required<SportsApiPayload>> | null = null;

function getSportsData() {
  sportsDataPromise ??= loadSportsData();
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
};
