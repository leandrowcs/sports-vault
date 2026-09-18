import type { League, Player, SportEvent, SportEventSummary, Team } from "../frontend/src/types/sports";

export interface SportsData {
  leagues: League[];
  teams: Team[];
  events: SportEvent[];
  players: Player[];
}

export function loadSportsData(): Promise<SportsData>;
export function loadEventSummary(leagueId: string, eventId: string): Promise<SportEventSummary | null>;
