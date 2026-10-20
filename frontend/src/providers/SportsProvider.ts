import type { FootballSeasonSchedule, FootballStanding, League, Player, SportEvent, SportEventSummary, Team } from '../types/sports'

export interface SportsProvider {
  getLeagues(): Promise<League[]>
  getTeams(): Promise<Team[]>
  getEvents(): Promise<SportEvent[]>
  getPlayers(): Promise<Player[]>
  getEventSummary(event: SportEvent): Promise<SportEventSummary | null>
  getLeagueStandings(leagueId: string): Promise<FootballStanding[]>
  getFootballSeasonSchedule(leagueId: string): Promise<FootballSeasonSchedule>
}