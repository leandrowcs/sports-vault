import type { League, Player, SportEvent, SportEventSummary, Team } from '../types/sports'

export interface SportsProvider {
  getLeagues(): Promise<League[]>
  getTeams(): Promise<Team[]>
  getEvents(): Promise<SportEvent[]>
  getPlayers(): Promise<Player[]>
  getEventSummary(event: SportEvent): Promise<SportEventSummary | null>
}