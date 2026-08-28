import type { League, SportEvent, Team } from '../types/sports'
export interface SportsProvider { getLeagues(): Promise<League[]>; getTeams(): Promise<Team[]>; getEvents(): Promise<SportEvent[]> }